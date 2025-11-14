// src/controllers/api.js
const User = require('../models/User');
const Product = require('../models/Product');
const Interaction = require('../models/Interaction');
const Order = require('../models/Order');
const ItemSimilarity = require('../models/ItemSimilarity');

/* ===================== USERS ===================== */
// POST /api/users  (СЂРµРіРёСЃС‚СЂР°С†РёСЏ Р±РµР· РїР°СЂРѕР»СЏ вЂ” РїРѕ С‚СЂРµР±РѕРІР°РЅРёСЏРј РЅСѓР¶РЅР° СЂРµРіРёСЃС‚СЂР°С†РёСЏ/РїСЂРѕС„РёР»СЊ)
exports.createUser = async (req, res) => {
    try {
        const { id, email, name, segments = [] } = req.body;
        if (!email || !name) return res.status(400).json({ ok: false, error: 'email and name are required' });
        const _id = id || `u_${Date.now()}`;
        const user = await User.create({ _id, email, name, segments });
        return res.status(201).json({ ok: true, data: user });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

// GET /api/users/:id
exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).lean();
        if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
        return res.json({ ok: true, data: user });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

// GET /api/users/:id/history  (рџ’Ґ РўСЂРµР±РѕРІР°РЅРёРµ в„–3: РёСЃС‚РѕСЂРёСЏ РІР·Р°РёРјРѕРґРµР№СЃС‚РІРёР№ + РїРѕРєСѓРїРѕРє)
exports.getUserHistory = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.auth?.userId && req.auth.userId !== id) {
            return res.status(403).json({ ok: false, error: 'Access denied' });
        }
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const since = req.query.since ? new Date(req.query.since) : null;

        const interactionFilter = { userId: id };
        if (since) interactionFilter.ts = { $gte: since };

        const interactions = await Interaction
            .find(interactionFilter)
            .sort({ ts: -1 })
            .limit(limit)
            .lean();

        const orders = await Order
            .find({ userId: id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return res.json({
            ok: true,
            data: {
                interactions, // views/likes/add_to_cart/purchase
                orders        // РёСЃС‚РѕСЂРёСЏ РїРѕРєСѓРїРѕРє
            }
        });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

/* ===================== PRODUCTS ===================== */
// POST /api/products  (Р°РґРјРёРЅ: СЃРѕР·РґР°С‚СЊ)
exports.createProduct = async (req, res) => {
    try {
        const { id, name, description = '', categoryId, categoryName, price, brand, rating, attrs } = req.body;
        if (!name || price == null) return res.status(400).json({ ok: false, error: 'name and price are required' });
        const _id = id || `p_${Date.now()}`;
        const prod = await Product.create({ _id, name, description, categoryId, categoryName, price, brand, rating, attrs });
        return res.status(201).json({ ok: true, data: prod });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

// GET /api/products  (СЃРїРёСЃРѕРє + РїРѕРёСЃРє + С„РёР»СЊС‚СЂС‹)
exports.listProducts = async (req, res) => {
    try {
        const { q, categoryId, categoryName, minPrice, maxPrice, sort } = req.query;
        const filter = {};
        if (q) filter.$text = { $search: q };
        if (categoryId) {
            filter.categoryId = categoryId;
        } else if (categoryName) {
            filter.categoryName = categoryName;
        }
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        let cursor = Product.find(filter).select('name price brand rating categoryId categoryName createdAt');
        // СЃРѕСЂС‚РёСЂРѕРІРєРё: rating_desc, price_asc, price_desc, newest
        if (sort === 'rating_desc') cursor = cursor.sort({ rating: -1 });
        else if (sort === 'price_asc') cursor = cursor.sort({ price: 1 });
        else if (sort === 'price_desc') cursor = cursor.sort({ price: -1 });
        else if (sort === 'newest') cursor = cursor.sort({ createdAt: -1 });

        const items = await cursor.limit(100).lean();
        res.set('Cache-Control', 'no-store');
        return res.json({ ok: true, data: items });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

// GET /api/products/:id
exports.getProduct = async (req, res) => {
    try {
        const prod = await Product.findById(req.params.id).lean();
        if (!prod) return res.status(404).json({ ok: false, error: 'Product not found' });
        return res.json({ ok: true, data: prod });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

// PUT /api/products/:id (Р°РґРјРёРЅ: РѕР±РЅРѕРІРёС‚СЊ)
exports.updateProduct = async (req, res) => {
    try {
        const prod = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
        if (!prod) return res.status(404).json({ ok: false, error: 'Product not found' });
        return res.json({ ok: true, data: prod });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

// DELETE /api/products/:id (Р°РґРјРёРЅ: СѓРґР°Р»РёС‚СЊ)
exports.deleteProduct = async (req, res) => {
    try {
        const r = await Product.findByIdAndDelete(req.params.id).lean();
        if (!r) return res.status(404).json({ ok: false, error: 'Product not found' });
        return res.json({ ok: true, data: { deleted: req.params.id } });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

/* ===================== INTERACTIONS ===================== */
// POST /api/interactions
exports.createInteraction = async (req, res) => {
    try {
        const tokenUserId = req.auth?.userId;
        const bodyUserId = req.body.userId;
        if (!tokenUserId) return res.status(401).json({ ok: false, error: 'Auth required' });
        if (bodyUserId && bodyUserId !== tokenUserId) {
            return res.status(403).json({ ok: false, error: 'userId mismatch' });
        }
        const { productId, type, value } = req.body;
        if (!productId || !type) return res.status(400).json({ ok: false, error: 'productId and type required' });
        const doc = await Interaction.create({ userId: tokenUserId, productId, type, value, ts: new Date() });
        return res.status(201).json({ ok: true, data: doc });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

/* ===================== ORDERS ===================== */
// POST /api/orders/checkout   (СѓРїСЂРѕС‰РµРЅРЅС‹Р№ С‡РµРєР°СѓС‚)
exports.checkout = async (req, res) => {
    try {
        const tokenUserId = req.auth?.userId;
        const bodyUserId = req.body.userId;
        if (!tokenUserId) return res.status(401).json({ ok: false, error: 'Auth required' });
        if (bodyUserId && bodyUserId !== tokenUserId) {
            return res.status(403).json({ ok: false, error: 'userId mismatch' });
        }
        const { items } = req.body; // [{productId, qty, price}]
        if (!Array.isArray(items) || !items.length) {
            return res.status(400).json({ ok: false, error: 'items[] required' });
        }
        const total = items.reduce((s, it) => s + it.qty * it.price, 0);
        const orderId = `o_${Date.now()}`;
        const order = await Order.create({
            _id: orderId,
            userId: tokenUserId,
            items,
            total,
            status: 'paid',
            createdAt: new Date()
        });
        // можно дополнительно записать interaction purchase по каждому item
        for (const it of items) {
            await Interaction.create({ userId: tokenUserId, productId: it.productId, type: 'purchase', value: 6, ts: new Date() });
        }
        return res.status(201).json({ ok: true, data: order });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

// GET /api/orders/me (current user)
exports.myOrders = async (req, res) => {
    try {
        const tokenUserId = req.auth?.userId;
        const requested = req.query.userId;
        if (!tokenUserId) return res.status(401).json({ ok: false, error: 'Auth required' });
        if (requested && requested !== tokenUserId) {
            return res.status(403).json({ ok: false, error: 'userId mismatch' });
        }
        const orders = await Order.find({ userId: tokenUserId }).sort({ createdAt: -1 }).lean();
        return res.json({ ok: true, data: orders });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

/* ===================== RECOMMENDATIONS ===================== */
// GET /api/products/:id/similar
exports.similarProducts = async (req, res) => {
    try {
        const row = await ItemSimilarity.findOne({ productId: req.params.id }).lean();
        if (!row) return res.json({ ok: true, data: [] });
        // РїРѕРґС‚СЏРЅРµРј РєР°СЂС‚РѕС‡РєРё РґР»СЏ РЅР°РіР»СЏРґРЅРѕСЃС‚Рё
        const ids = row.neighbors.map(n => n.productId);
        const prods = await Product.find({ _id: { $in: ids } }).select('name price brand rating categoryName').lean();
        // РІРµСЂРЅС‘Рј СЃ СЃРѕСЂС‚РёСЂРѕРІРєРѕР№ РїРѕ sim
        const byId = new Map(prods.map(p => [p._id, p]));
        const data = row.neighbors.map(n => ({ sim: n.sim, product: byId.get(n.productId) || { _id: n.productId } }));
        return res.json({ ok: true, data });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

// GET /api/recommendations/:userId
// simple: СЃРѕР±РёСЂР°РµРј РїРѕСЃР»РµРґРЅРёРµ N РёРЅС‚РµСЂР°РєС†РёР№ СЋР·РµСЂР° Рё РІРѕР·РІСЂР°С‰Р°РµРј РѕР±СЉРµРґРёРЅРµРЅРёРµ СЃРѕСЃРµРґРµР№
exports.recommendForUser = async (req, res) => {
    try {
        const { userId } = req.params;
        if (req.auth?.userId && req.auth.userId !== userId) {
            return res.status(403).json({ ok: false, error: 'Access denied' });
        }
        const N = Math.min(Number(req.query.n) || 20, 100);

        const last = await Interaction.find({ userId }).sort({ ts: -1 }).limit(50).lean();
        if (!last.length) {
            return res.json({ ok: true, data: [] });
        }
        const viewed = new Set(last.map((x) => x.productId));

        const uniq = new Map();
        for (const it of last) {
            const simRow = await ItemSimilarity.findOne({ productId: it.productId }).lean();
            if (!simRow) continue;
            for (const nb of simRow.neighbors) {
                if (viewed.has(nb.productId)) continue;
                const add = nb.sim * (it.value || 1);
                uniq.set(nb.productId, (uniq.get(nb.productId) || 0) + add);
            }
        }

        if (!uniq.size) {
            return res.json({ ok: true, data: [] });
        }

        const scored = Array.from(uniq.entries()).sort((a, b) => b[1] - a[1]).slice(0, N);
        const ids = scored.map(([pid]) => pid);
        const prods = await Product.find({ _id: { $in: ids } }).select('name price brand rating categoryName').lean();
        const byId = new Map(prods.map((p) => [p._id, p]));
        const data = scored.map(([pid, score]) => ({ score, product: byId.get(pid) || { _id: pid } }));

        return res.json({ ok: true, data });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};
