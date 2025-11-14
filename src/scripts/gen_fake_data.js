require('dotenv').config();
const bcrypt = require('bcryptjs');

const { connectDB } = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const Interaction = require('../models/Interaction');
const Order = require('../models/Order');
const ItemSimilarity = require('../models/ItemSimilarity');

const args = process.argv.slice(2).reduce((acc, arg) => {
    if (!arg.startsWith('--')) return acc;
    const [key, raw] = arg.slice(2).split('=');
    acc[key] = raw === undefined ? true : raw;
    return acc;
}, {});

const toNumber = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

const config = {
    users: toNumber(args.users || process.env.FAKE_USERS, 1200),
    products: toNumber(args.products || process.env.FAKE_PRODUCTS, 800),
    minInteractions: toNumber(args.minInteractions || process.env.FAKE_MIN_INTERACTIONS, 25),
    maxInteractions: toNumber(args.maxInteractions || process.env.FAKE_MAX_INTERACTIONS, 60),
};

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

const firstNames = ['Alex', 'Sam', 'Chris', 'Jamie', 'Taylor', 'Jordan', 'Morgan', 'Robin', 'Casey', 'Drew'];
const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Jackson'];
const segmentsPool = ['electronics', 'gaming', 'home', 'office', 'new', 'vip'];

const categories = [
    { id: 'c_10', name: 'Keyboards' },
    { id: 'c_11', name: 'Mice' },
    { id: 'c_12', name: 'Monitors' },
    { id: 'c_13', name: 'Audio' },
    { id: 'c_14', name: 'Accessories' },
];

const brands = ['Logitech', 'Razer', 'Keychron', 'Dell', 'HP', 'Lenovo', 'Apple', 'Asus', 'HyperX', 'SteelSeries'];
const productAdjectives = ['Wireless', 'Mechanical', 'Pro', 'Ultra', 'Compact', 'Gaming', 'Silent', 'RGB', 'Smart', 'Portable'];
const productNouns = ['Keyboard', 'Mouse', 'Headset', 'Monitor', 'Speaker', 'Dock', 'Webcam', 'Trackpad', 'Microphone', 'Hub'];

const interactionTypes = [
    { type: 'view', weight: 60, value: 1 },
    { type: 'like', weight: 15, value: 2 },
    { type: 'add_to_cart', weight: 15, value: 4 },
    { type: 'purchase', weight: 10, value: 6 },
];

function weightedInteraction() {
    const total = interactionTypes.reduce((sum, it) => sum + it.weight, 0);
    const target = Math.random() * total;
    let acc = 0;
    for (const it of interactionTypes) {
        acc += it.weight;
        if (target <= acc) return { type: it.type, value: it.value };
    }
    return { type: 'view', value: 1 };
}

async function run() {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is not set');
    console.log('[gen_fake_data] connecting to DB…');
    await connectDB(uri);

    console.log('[gen_fake_data] clearing collections…');
    await Promise.all([
        User.deleteMany({}),
        Product.deleteMany({}),
        Interaction.deleteMany({}),
        Order.deleteMany({}),
        ItemSimilarity.deleteMany({}),
    ]);

    console.log('[gen_fake_data] generating users/products/interactions…');
    const passwordHash = await bcrypt.hash('Passw0rd!', 8);

    const users = Array.from({ length: config.users }, (_v, idx) => {
        const first = pick(firstNames);
        const last = pick(lastNames);
        const segments = segmentsPool.filter(() => Math.random() < 0.35);
        return {
            _id: `u_perf_${idx + 1}`,
            email: `user${idx + 1}@perf.local`,
            name: `${first} ${last}`,
            segments: segments.length ? segments : [pick(segmentsPool)],
            password: passwordHash,
        };
    });

    const products = Array.from({ length: config.products }, (_v, idx) => {
        const category = pick(categories);
        const brand = pick(brands);
        const adjective = pick(productAdjectives);
        const noun = pick(productNouns);
        return {
            _id: `p_perf_${idx + 1}`,
            name: `${brand} ${adjective} ${noun}`,
            description: `${adjective} ${noun} by ${brand}`,
            categoryId: category.id,
            categoryName: category.name,
            price: rand(20, 900),
            brand,
            rating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
            attrs: {
                wireless: Math.random() > 0.4,
                color: pick(['black', 'white', 'silver', 'space gray']),
            },
            createdAt: new Date(Date.now() - rand(0, 90) * 86400000),
        };
    });

    console.time('[gen_fake_data] insert users');
    await User.insertMany(users, { ordered: false });
    console.timeEnd('[gen_fake_data] insert users');

    console.time('[gen_fake_data] insert products');
    await Product.insertMany(products, { ordered: false });
    console.timeEnd('[gen_fake_data] insert products');

    const productIds = products.map((p) => p._id);
    const interactions = [];
    const now = Date.now();

    for (const user of users) {
        const interactionsForUser = rand(config.minInteractions, config.maxInteractions);
        for (let i = 0; i < interactionsForUser; i += 1) {
            const { type, value } = weightedInteraction();
            interactions.push({
                userId: user._id,
                productId: pick(productIds),
                type,
                value,
                ts: new Date(now - rand(0, 60 * 24) * 3600 * 1000),
            });
        }
    }

    console.time('[gen_fake_data] insert interactions');
    await Interaction.insertMany(interactions, { ordered: false });
    console.timeEnd('[gen_fake_data] insert interactions');

    console.log(`[gen_fake_data] Done: users=${users.length}, products=${products.length}, interactions=${interactions.length}`);
    process.exit(0);
}

run().catch((err) => {
    console.error('[gen_fake_data] Error:', err);
    process.exit(1);
});
