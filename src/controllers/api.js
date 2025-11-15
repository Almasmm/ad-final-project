// src/controllers/api.js
const User = require('../models/User');
const Product = require('../models/Product');
const Interaction = require('../models/Interaction');
const Order = require('../models/Order');
const ItemSimilarity = require('../models/ItemSimilarity');
const UserHistory = require('../models/UserHistory');
const { logHistory } = require('../services/historyLogger');

const MAX_VIEW_HISTORY = Number(process.env.USER_VIEW_HISTORY_LIMIT || 200);
const MAX_PURCHASE_HISTORY = Number(process.env.USER_PURCHASE_HISTORY_LIMIT || 200);
const MAX_RECO_CACHE = Number(process.env.USER_RECO_CACHE_LIMIT || 50);

const normalizeStringArray = (value) => {
    if (Array.isArray(value)) return value.map((s) => String(s || '').trim()).filter(Boolean);
    if (typeof value === 'string') {
        return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
};

const sanitizeUser = (user) => {
    if (!user) return null;
    const plain = typeof user.toObject === 'function' ? user.toObject() : user;
    return {
        _id: plain._id,
        email: plain.email,
        name: plain.name,
        role: plain.role,
        emailVerified: !!plain.emailVerified,
        interests: plain.interests || [],
        segments: plain.segments || [],
        wishlist: plain.wishlist || [],
        viewHistory: plain.viewHistory || [],
        purchaseHistory: plain.purchaseHistory || [],
        cachedRecommendations: plain.cachedRecommendations || [],
        lastSeenAt: plain.lastSeenAt || null,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    };
};

/* ===================== USERS ===================== */
// POST /api/users  (legacy bootstrap from scripts)
exports.createUser = async (req, res) => {
    try {
        const { id, email, name } = req.body;
        if (!email || !name) return res.status(400).json({ ok: false, error: 'email and name are required' });
        const _id = id || `u_${Date.now()}`;
        const user = await User.create({
            _id,
            email: String(email).trim().toLowerCase(),
            name: String(name).trim(),
            segments: normalizeStringArray(req.body.segments),
            interests: normalizeStringArray(req.body.interests),
            wishlist: normalizeStringArray(req.body.wishlist),
        });
        return res.status(201).json({ ok: true, data: sanitizeUser(user) });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

// GET /api/users/:id
exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).lean();
        if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
        return res.json({ ok: true, data: sanitizeUser(user) });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

// GET /api/users/me
exports.getMyProfile = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ ok: false, error: 'Auth required' });
        const user = await User.findById(userId).lean();
        if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
        return res.json({ ok: true, data: sanitizeUser(user) });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

// PATCH /api/users/me
exports.updateMyProfile = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ ok: false, error: 'Auth required' });

        const updates = {};
        if (typeof req.body.name === 'string') {
            const trimmed = req.body.name.trim();
            if (!trimmed) return res.status(400).json({ ok: false, error: 'name cannot be empty' });
            updates.name = trimmed;
        }
        if (req.body.interests !== undefined) {
            updates.interests = normalizeStringArray(req.body.interests);
        }
        if (req.body.segments !== undefined) {
            updates.segments = normalizeStringArray(req.body.segments);
        }
        if (req.body.wishlist !== undefined) {
            updates.wishlist = normalizeStringArray(req.body.wishlist);
        }

        if (!Object.keys(updates).length) {
        return res.status(400).json({ ok: false, error: 'No fields to update' });
    }

    updates.updatedAt = new Date();

    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    return res.json({ ok: true, data: sanitizeUser(user) });
} catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
}
};

exports.listUsers = async (_req, res) => {
    try {
        const users = await User.find({})
            .select('_id email name role emailVerified createdAt updatedAt lastSeenAt')
            .lean();
        return res.json({ ok: true, data: users });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

exports.adminUpdateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = {};
        if (typeof req.body.name === 'string') {
            const trimmed = req.body.name.trim();
            if (!trimmed) return res.status(400).json({ ok: false, error: 'name cannot be empty' });
            updates.name = trimmed;
        }
        if (typeof req.body.role === 'string') {
            updates.role = req.body.role;
        }
        if (req.body.segments !== undefined) {
            updates.segments = normalizeStringArray(req.body.segments);
        }
        if (req.body.interests !== undefined) {
            updates.interests = normalizeStringArray(req.body.interests);
        }
        if (req.body.wishlist !== undefined) {
            updates.wishlist = normalizeStringArray(req.body.wishlist);
        }
        if (!Object.keys(updates).length) {
            return res.status(400).json({ ok: false, error: 'No fields to update' });
        }
        updates.updatedAt = new Date();
        const user = await User.findByIdAndUpdate(id, updates, { new: true }).lean();
        if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
        return res.json({ ok: true, data: sanitizeUser(user) });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

exports.adminDeleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await User.findByIdAndDelete(id).lean();
        if (!deleted) return res.status(404).json({ ok: false, error: 'User not found' });
        return res.json({ ok: true, data: { deleted: id } });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

// GET /api/users/:id/history (interactions + orders)
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
                interactions,
                orders,
            }
        });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

exports.getMyWishlist = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ ok: false, error: 'Auth required' });
        const user = await User.findById(userId).lean();
        if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
        const wishlistIds = user.wishlist || [];
        let items = [];
        if (wishlistIds.length) {
            const products = await Product.find({ _id: { $in: wishlistIds } })
                .select('name price brand rating categoryName tags')
                .lean();
            const byId = new Map(products.map((p) => [p._id, p]));
            items = wishlistIds.map((id) => byId.get(id)).filter(Boolean);
        }
        const recommendations = await computeWishlistRecommendations(wishlistIds, userId, 12);
        return res.json({ ok: true, data: { items, recommendations } });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ ok: false, error: 'Auth required' });
        const { productId } = req.params;
        if (!productId) return res.status(400).json({ ok: false, error: 'productId required' });
        const user = await User.findByIdAndUpdate(
            userId,
            { $pull: { wishlist: productId } },
            { new: true }
        ).lean();
        if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
        return res.json({ ok: true, data: { wishlist: user.wishlist || [] } });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};
/* ===================== PRODUCTS ===================== */
exports.createProduct = async (req, res) => {
    try {
        const { id, name, description = '', categoryId, categoryName, category, price, brand, rating, attrs } = req.body;
        if (!name || price == null) return res.status(400).json({ ok: false, error: 'name and price are required' });
        const _id = id || `p_${Date.now()}`;
        const prod = await Product.create({
            _id,
            name,
            description,
            categoryId,
            categoryName,
            category: category || categoryName || null,
            price,
            brand,
            rating,
            attrs,
            relatedProducts: normalizeStringArray(req.body.relatedProducts),
            tags: normalizeStringArray(req.body.tags),
        });
        return res.status(201).json({ ok: true, data: prod });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

exports.listProducts = async (req, res) => {
    try {
        const {
            q,
            categoryId,
            categoryName,
            category,
            minPrice,
            maxPrice,
            minRating,
            maxRating,
            tags,
            sort,
        } = req.query;
        const filter = {};
        if (q) filter.$text = { $search: q };
        if (categoryId) {
            filter.categoryId = categoryId;
        } else if (categoryName) {
            filter.categoryName = categoryName;
        } else if (category) {
            filter.$or = [{ category }, { categoryName: category }, { categoryId: category }];
        }
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }
        if (minRating || maxRating) {
            filter.rating = {};
            if (minRating) filter.rating.$gte = Number(minRating);
            if (maxRating) filter.rating.$lte = Number(maxRating);
        }
        const tagsArray = normalizeStringArray(tags);
        if (tagsArray.length) {
            filter.tags = { $all: tagsArray };
        }

        if (req.ctx?.userId && (categoryId || categoryName || category)) {
            const categoryKey = categoryId || categoryName || category;
            await logHistory({
                userId: req.ctx.userId,
                productId: `category:${categoryKey}`,
                action: 'view',
            });
        }

        let cursor = Product
            .find(filter)
            .select('name price brand rating categoryId categoryName category tags createdAt');
        if (sort === 'price_asc') cursor = cursor.sort({ price: 1 });
        else if (sort === 'price_desc') cursor = cursor.sort({ price: -1 });
        else if (sort === 'popularity' || sort === 'rating_desc') cursor = cursor.sort({ rating: -1, createdAt: -1 });
        else if (sort === 'newest') cursor = cursor.sort({ createdAt: -1 });
        else cursor = cursor.sort({ createdAt: -1 });

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
        if (req.ctx?.userId) {
            await logHistory({ userId: req.ctx.userId, productId: prod._id, action: 'view' });
        }
        const viewsCount = await UserHistory.countDocuments({ productId: prod._id, action: 'view' });
        return res.json({ ok: true, data: { ...prod, viewsCount } });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

// GET /api/products/:id/bought-together
exports.getBoughtTogether = async (req, res) => {
    try {
        const { id } = req.params;
        const orders = await Order.find({ 'items.productId': id }).lean();
        if (!orders.length) return res.json({ ok: true, data: [] });
        const freq = new Map();
        for (const order of orders) {
            for (const item of order.items || []) {
                if (item.productId === id) continue;
                freq.set(item.productId, (freq.get(item.productId) || 0) + (item.qty || 1));
            }
        }
        if (!freq.size) return res.json({ ok: true, data: [] });
        const ranked = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const ids = ranked.map(([pid]) => pid);
        const prods = await Product.find({ _id: { $in: ids } }).select('name price brand rating categoryName').lean();
        const map = new Map(prods.map((p) => [p._id, p]));
        const data = ranked.map(([pid, score]) => ({ score, product: map.get(pid) || { _id: pid } }));
        return res.json({ ok: true, data });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};


exports.updateProduct = async (req, res) => {
    try {
        const updates = { ...req.body };
        if (updates.tags !== undefined) {
            updates.tags = normalizeStringArray(updates.tags);
        }
        if (updates.relatedProducts !== undefined) {
            updates.relatedProducts = normalizeStringArray(updates.relatedProducts);
        }
        if (updates.category === undefined && updates.categoryName) {
            updates.category = updates.categoryName;
        }
        const prod = await Product.findByIdAndUpdate(req.params.id, updates, { new: true }).lean();
        if (!prod) return res.status(404).json({ ok: false, error: 'Product not found' });
        return res.json({ ok: true, data: prod });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

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
        const ts = new Date();
        const doc = await Interaction.create({ userId: tokenUserId, productId, type, value, ts });

        const userUpdate = {};
        if (type === 'view') {
            userUpdate.$push = {
                ...(userUpdate.$push || {}),
                viewHistory: {
                    $each: [{ productId, ts }],
                    $slice: -MAX_VIEW_HISTORY,
                },
            };
        }
        if (type === 'like') {
            userUpdate.$addToSet = {
                ...(userUpdate.$addToSet || {}),
                wishlist: productId,
            };
        }

        if (Object.keys(userUpdate).length) {
            await User.findByIdAndUpdate(tokenUserId, userUpdate);
        }

        const actionMap = {
            view: 'view',
            like: 'like',
            add_to_cart: 'cartAdd',
            purchase: 'purchase',
        };
        const historyAction = actionMap[type];
        if (historyAction) {
            await logHistory({ userId: tokenUserId, productId, action: historyAction });
        }

        return res.status(201).json({ ok: true, data: doc });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

/* ===================== ORDERS ===================== */
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
        const ts = new Date();
        const orderId = `o_${Date.now()}`;
        const order = await Order.create({
            _id: orderId,
            userId: tokenUserId,
            items,
            total,
            status: 'paid',
            createdAt: ts
        });
        for (const it of items) {
            await Interaction.create({ userId: tokenUserId, productId: it.productId, type: 'purchase', value: 6, ts });
            await logHistory({ userId: tokenUserId, productId: it.productId, action: 'purchase' });
        }

        const purchaseRecords = items.map((it) => ({
            orderId,
            productId: it.productId,
            qty: it.qty,
            price: it.price,
            ts,
        }));

        const update = {
            $push: {
                purchaseHistory: {
                    $each: purchaseRecords,
                    $slice: -MAX_PURCHASE_HISTORY,
                },
            },
        };
        const purchasedIds = items.map((it) => it.productId).filter(Boolean);
        if (purchasedIds.length) {
            update.$pull = { wishlist: { $in: purchasedIds } };
        }
        await User.findByIdAndUpdate(tokenUserId, update);

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
        const ids = row.neighbors.map(n => n.productId);
        const prods = await Product.find({ _id: { $in: ids } }).select('name price brand rating categoryName').lean();
        const byId = new Map(prods.map(p => [p._id, p]));
        const data = row.neighbors.map(n => ({ sim: n.sim, product: byId.get(n.productId) || { _id: n.productId } }));
        return res.json({ ok: true, data });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

// GET /api/recommendations/:userId
exports.recommendForUser = async (req, res) => {
    try {
        const { userId } = req.params;
        if (req.auth?.userId && req.auth.userId !== userId) {
            return res.status(403).json({ ok: false, error: 'Access denied' });
        }
        const N = Math.min(Number(req.query.n) || 20, 100);
        const purchased = await getPurchasedSet(userId);
        const data = await computePersonalRecommendations(userId, N, purchased);
        return res.json({ ok: true, data });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

async function getPurchasedSet(userId) {
    const docs = await UserHistory.find({ userId, action: 'purchase' }).select('productId').lean();
    return new Set(docs.map((doc) => doc.productId));
}

async function computePersonalRecommendations(userId, limit = 20, purchasedSet = new Set()) {
    const interactions = await Interaction.find({ userId }).sort({ ts: -1 }).limit(50).lean();
    if (!interactions.length) {
        await User.findByIdAndUpdate(userId, { cachedRecommendations: [] }).catch(() => {});
        return [];
    }

    const viewedIds = [...new Set(interactions.map((it) => it.productId))];
    const exclude = new Set(purchasedSet);
    viewedIds.forEach((id) => exclude.add(id));

    const simDocs = await ItemSimilarity.find({ productId: { $in: viewedIds } }).lean();
    const simMap = new Map(simDocs.map((row) => [row.productId, row.neighbors]));

    const scores = new Map();
    for (const interaction of interactions) {
        const neighbors = simMap.get(interaction.productId);
        if (!neighbors) continue;
        for (const nb of neighbors) {
            if (exclude.has(nb.productId)) continue;
            const delta = nb.sim * (interaction.value || 1);
            scores.set(nb.productId, (scores.get(nb.productId) || 0) + delta);
        }
    }

    if (!scores.size) {
        await User.findByIdAndUpdate(userId, { cachedRecommendations: [] }).catch(() => {});
        return [];
    }

    const ranked = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
    const ids = ranked.map(([pid]) => pid);
    const prods = await Product.find({ _id: { $in: ids } }).select('name price brand rating categoryName tags').lean();
    const byId = new Map(prods.map((p) => [p._id, p]));
    const data = ranked.map(([pid, score]) => ({ score, product: byId.get(pid) || { _id: pid } }));

    const cached = ranked.slice(0, Math.min(MAX_RECO_CACHE, ranked.length)).map(([pid, score]) => ({
        productId: pid,
        score,
        ts: new Date(),
    }));
    await User.findByIdAndUpdate(userId, { cachedRecommendations: cached }).catch(() => {});

    return data;
}

async function computeWishlistRecommendations(wishlistIds = [], userId, limit = 12, purchasedSet = new Set()) {
    if (!wishlistIds.length) return [];
    if (!purchasedSet.size && userId) {
        purchasedSet = await getPurchasedSet(userId);
    }
    const exclude = new Set([...wishlistIds, ...(purchasedSet ? Array.from(purchasedSet) : [])]);
    const simDocs = await ItemSimilarity.find({ productId: { $in: wishlistIds } }).lean();
    const scores = new Map();
    for (const row of simDocs) {
        for (const neighbor of row.neighbors || []) {
            if (exclude.has(neighbor.productId)) continue;
            scores.set(neighbor.productId, (scores.get(neighbor.productId) || 0) + neighbor.sim);
        }
    }
    if (!scores.size) return [];
    const ranked = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
    const ids = ranked.map(([pid]) => pid);
    const prods = await Product.find({ _id: { $in: ids } }).select('name price brand rating categoryName tags').lean();
    const byId = new Map(prods.map((p) => [p._id, p]));
    return ranked.map(([pid, score]) => ({ score, product: byId.get(pid) || { _id: pid } }));
}

async function computeRecentViewRecommendations(userId, purchasedSet = new Set(), limit = 12) {
    const recentViews = await UserHistory.find({ userId, action: 'view' }).sort({ timestamp: -1 }).limit(10).lean();
    if (!recentViews.length) return [];
    const viewIds = [...new Set(recentViews.map((h) => h.productId))];
    const simDocs = await ItemSimilarity.find({ productId: { $in: viewIds } }).lean();
    const simMap = new Map(simDocs.map((row) => [row.productId, row.neighbors]));

    const results = [];
    const added = new Set();
    const blocked = new Set(purchasedSet);

    for (const view of recentViews) {
        const neighbors = simMap.get(view.productId);
        if (!neighbors) continue;
        for (const nb of neighbors) {
            if (blocked.has(nb.productId) || added.has(nb.productId)) continue;
            added.add(nb.productId);
            results.push(nb.productId);
            if (results.length >= limit) break;
        }
        if (results.length >= limit) break;
    }

    if (!results.length) return [];
    const prods = await Product.find({ _id: { $in: results } }).select('name price brand rating categoryName tags').lean();
    const byId = new Map(prods.map((p) => [p._id, p]));
    return results.map((pid) => ({ product: byId.get(pid) || { _id: pid } }));
}

async function computeSimilarUsersRecommendations(userId, purchasedSet = new Set(), limit = 12) {
    const baseEvents = await UserHistory.find({
        userId,
        action: { $in: ['like', 'purchase'] },
    }).sort({ timestamp: -1 }).limit(30).lean();

    if (!baseEvents.length) return [];
    const baseProducts = [...new Set(baseEvents.map((entry) => entry.productId))];
    const peerIds = await UserHistory.distinct('userId', {
        productId: { $in: baseProducts },
        action: { $in: ['like', 'purchase'] },
        userId: { $ne: userId },
    });
    if (!peerIds.length) return [];

    const peersSubset = peerIds.slice(0, 50);
    const peerHistory = await UserHistory.find({
        userId: { $in: peersSubset },
        action: { $in: ['like', 'purchase'] },
    }).lean();

    const blocked = new Set([...purchasedSet, ...baseProducts]);
    const scoreMap = new Map();
    for (const entry of peerHistory) {
        if (entry.userId === userId) continue;
        if (blocked.has(entry.productId)) continue;
        scoreMap.set(entry.productId, (scoreMap.get(entry.productId) || 0) + 1);
    }
    if (!scoreMap.size) return [];

    const ranked = Array.from(scoreMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
    const ids = ranked.map(([pid]) => pid);
    const prods = await Product.find({ _id: { $in: ids } }).select('name price brand rating categoryName tags').lean();
    const byId = new Map(prods.map((p) => [p._id, p]));
    return ranked.map(([pid, score]) => ({ score, product: byId.get(pid) || { _id: pid } }));
}

// GET /recommend/user/:id
exports.recommendBundle = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.auth?.userId && req.auth.userId !== id) {
            return res.status(403).json({ ok: false, error: 'Access denied' });
        }
        const purchased = await getPurchasedSet(id);
        const [personal, recent, similarUsers] = await Promise.all([
            computePersonalRecommendations(id, 20, purchased),
            computeRecentViewRecommendations(id, purchased, 12),
            computeSimilarUsersRecommendations(id, purchased, 12),
        ]);
        return res.json({
            ok: true,
            data: {
                personal,
                recent,
                similarUsers,
            },
        });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};
