// src/scripts/build_sims.js
require('dotenv').config();
const { connectDB } = require('../config/db');
const Interaction = require('../models/Interaction');
const ItemSimilarity = require('../models/ItemSimilarity');

/**
 * Вес событий (можно менять):
 * view=1, like=3, add_to_cart=4, purchase=6
 */
const WEIGHT = { view: 1, like: 3, add_to_cart: 4, purchase: 6 };

// сколько соседей хранить на товар
const TOP_K = 20;

// по каким данным считаем: последние N месяцев
const MONTHS_BACK = 12;

async function build() {
    await connectDB(process.env.MONGO_URI);

    const since = new Date();
    since.setMonth(since.getMonth() - MONTHS_BACK);

    // 1) Собираем пользователь→товар→вес (agg по последним MONTHS_BACK)
    const pipeline = [
        { $match: { ts: { $gte: since } } },
        {
            $project: {
                userId: 1,
                productId: 1,
                w: {
                    $switch: {
                        branches: [
                            { case: { $eq: ['$type', 'view'] }, then: WEIGHT.view },
                            { case: { $eq: ['$type', 'like'] }, then: WEIGHT.like },
                            { case: { $eq: ['$type', 'add_to_cart'] }, then: WEIGHT.add_to_cart },
                            { case: { $eq: ['$type', 'purchase'] }, then: WEIGHT.purchase },
                        ],
                        default: 1,
                    },
                },
            },
        },
        // суммируем по (userId, productId)
        {
            $group: {
                _id: { userId: '$userId', productId: '$productId' },
                w: { $sum: '$w' },
            },
        },
        // вернём «плоско»
        {
            $project: {
                _id: 0,
                userId: '$_id.userId',
                productId: '$_id.productId',
                w: 1,
            },
        },
    ];

    const rows = await Interaction.aggregate(pipeline).allowDiskUse(true);

    // 2) Строим словарь: product -> { user -> weight }
    const byItem = new Map();      // pid -> Map(uid -> w)
    const byUser = new Map();      // uid -> Array<{pid,w}>
    for (const r of rows) {
        if (!byItem.has(r.productId)) byItem.set(r.productId, new Map());
        byItem.get(r.productId).set(r.userId, r.w);

        if (!byUser.has(r.userId)) byUser.set(r.userId, []);
        byUser.get(r.userId).push({ pid: r.productId, w: r.w });
    }

    // 3) Косинусная похожесть item-item по ко-пользователям
    // косинус: sum(w_iu * w_ju) / (sqrt(sum(w_iu^2)) * sqrt(sum(w_ju^2)))
    // Сначала посчитаем нормы ||i||
    const norm = new Map(); // pid -> sqrt(sum w^2)
    for (const [pid, umap] of byItem.entries()) {
        let s = 0;
        for (const w of umap.values()) s += w * w;
        norm.set(pid, Math.sqrt(s) || 1e-9);
    }

    // Посчитаем попарные скоры через пробег по пользователям
    // (для каждого пользователя перебираем пары товаров из его истории)
    const co = new Map();  // "i|j" -> dot
    for (const [uid, items] of byUser.entries()) {
        // если у пользователя 1 предмет — ко-скора нет
        for (let a = 0; a < items.length; a++) {
            for (let b = a + 1; b < items.length; b++) {
                const i = items[a], j = items[b];
                const keyIJ = `${i.pid}|${j.pid}`;
                const keyJI = `${j.pid}|${i.pid}`;
                co.set(keyIJ, (co.get(keyIJ) || 0) + i.w * j.w);
                co.set(keyJI, (co.get(keyJI) || 0) + j.w * i.w);
            }
        }
    }

    // 4) Превратим скалярные произведения в косинусную похожесть
    // и соберём топ-K для каждого товара
    const neigh = new Map(); // pid -> Array<{productId, sim}>
    for (const [key, dot] of co.entries()) {
        const [i, j] = key.split('|');
        const sim = dot / (norm.get(i) * norm.get(j));
        if (!neigh.has(i)) neigh.set(i, []);
        neigh.get(i).push({ productId: j, sim: Number(sim.toFixed(6)) });
    }
    for (const [pid, arr] of neigh.entries()) {
        arr.sort((a, b) => b.sim - a.sim);
        neigh.set(pid, arr.slice(0, TOP_K));
    }

    // 5) Сохраняем в коллекцию item_similarities (upsert)
    const bulk = [];
    for (const [pid, neighbors] of neigh.entries()) {
        bulk.push({
            updateOne: {
                filter: { productId: pid },
                update: { $set: { neighbors, updatedAt: new Date() } },
                upsert: true,
            },
        });
    }
    if (bulk.length) {
        await ItemSimilarity.bulkWrite(bulk);
    }

    console.log(`✅ Sims built for ${neigh.size} products (TOP_K=${TOP_K}, months=${MONTHS_BACK})`);
    process.exit(0);
}

build().catch(e => {
    console.error('❌ build_sims error:', e);
    process.exit(1);
});
