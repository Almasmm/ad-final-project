const Cart = require('../models/Cart');
const Product = require('../models/Product');

function normalizePositiveQty(value, { min = 1 } = {}) {
    const num = Number(value);
    if (!Number.isFinite(num)) return min;
    const rounded = Math.floor(num);
    if (rounded < min) return min;
    return rounded;
}

function normalizeQtyAllowZero(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
        const err = new Error('qty must be a non-negative number');
        err.status = 400;
        throw err;
    }
    return Math.floor(num);
}

async function ensureCart(userId) {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
        cart = await Cart.create({
            _id: `cart_${userId}`,
            userId,
            items: [],
        });
    }
    return cart;
}

function computeTotals(items = []) {
    return items.reduce(
        (acc, item) => {
            const qty = Number(item.qty) || 0;
            const price = Number(item.price) || 0;
            acc.totalQty += qty;
            acc.totalPrice += qty * price;
            return acc;
        },
        { totalQty: 0, totalPrice: 0 }
    );
}

async function hydrateCart(cartDoc) {
    if (!cartDoc) {
        return {
            id: null,
            userId: null,
            items: [],
            totalItems: 0,
            totalQty: 0,
            totalPrice: 0,
            updatedAt: null,
        };
    }
    const plain = typeof cartDoc.toObject === 'function' ? cartDoc.toObject() : cartDoc;
    const items = plain.items || [];
    const ids = Array.from(new Set(items.map((item) => item.productId))).filter(Boolean);
    let products = [];
    if (ids.length) {
        products = await Product.find({ _id: { $in: ids } })
            .select('_id name brand price categoryName rating tags attrs')
            .lean();
    }
    const productMap = new Map(products.map((prod) => [prod._id, prod]));
    const enrichedItems = items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        price: item.price,
        product: productMap.get(item.productId) || null,
    }));
    const { totalQty, totalPrice } = computeTotals(enrichedItems);
    return {
        id: plain._id,
        userId: plain.userId,
        items: enrichedItems,
        totalItems: enrichedItems.length,
        totalQty,
        totalPrice: Math.round(totalPrice * 100) / 100,
        updatedAt: plain.updatedAt,
    };
}

exports.getMyCart = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ ok: false, error: 'Auth required' });
        const cart = await ensureCart(userId);
        const data = await hydrateCart(cart);
        return res.json({ ok: true, data });
    } catch (err) {
        const status = err.status || 400;
        return res.status(status).json({ ok: false, error: err.message });
    }
};

exports.addCartItem = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ ok: false, error: 'Auth required' });
        const { productId } = req.body || {};
        if (!productId) return res.status(400).json({ ok: false, error: 'productId is required' });
        const qty = normalizePositiveQty(req.body?.qty, { min: 1 });
        const product = await Product.findById(productId).lean();
        if (!product) return res.status(404).json({ ok: false, error: 'Product not found' });
        const cart = await ensureCart(userId);
        const existing = cart.items.find((item) => item.productId === productId);
        if (existing) {
            existing.qty += qty;
            existing.price = product.price;
        } else {
            cart.items.push({ productId, qty, price: product.price });
        }
        cart.items = cart.items.filter((item) => item.qty > 0);
        cart.updatedAt = new Date();
        await cart.save();
        const data = await hydrateCart(cart);
        return res.json({ ok: true, data });
    } catch (err) {
        const status = err.status || 400;
        return res.status(status).json({ ok: false, error: err.message });
    }
};

exports.updateCartItem = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ ok: false, error: 'Auth required' });
        const { productId } = req.params;
        if (!productId) return res.status(400).json({ ok: false, error: 'productId is required' });
        const qty = normalizeQtyAllowZero(req.body?.qty);
        const cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({ ok: false, error: 'Cart not found' });
        const item = cart.items.find((entry) => entry.productId === productId);
        if (!item) return res.status(404).json({ ok: false, error: 'Item not found in cart' });
        if (qty === 0) {
            cart.items = cart.items.filter((entry) => entry.productId !== productId);
        } else {
            item.qty = qty;
        }
        cart.updatedAt = new Date();
        await cart.save();
        const data = await hydrateCart(cart);
        return res.json({ ok: true, data });
    } catch (err) {
        const status = err.status || 400;
        return res.status(status).json({ ok: false, error: err.message });
    }
};

exports.removeCartItem = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ ok: false, error: 'Auth required' });
        const { productId } = req.params;
        if (!productId) return res.status(400).json({ ok: false, error: 'productId is required' });
        const cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({ ok: false, error: 'Cart not found' });
        const nextItems = cart.items.filter((item) => item.productId !== productId);
        if (nextItems.length === cart.items.length) {
            return res.status(404).json({ ok: false, error: 'Item not found in cart' });
        }
        cart.items = nextItems;
        cart.updatedAt = new Date();
        await cart.save();
        const data = await hydrateCart(cart);
        return res.json({ ok: true, data });
    } catch (err) {
        const status = err.status || 400;
        return res.status(status).json({ ok: false, error: err.message });
    }
};
