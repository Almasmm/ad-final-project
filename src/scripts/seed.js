require('dotenv').config();
const { connectDB } = require('../config/db');
const bcrypt = require('bcryptjs');

const User = require('../models/User')
const Product = require('../models/Product');
const Interaction = require('../models/Interaction');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const ItemSimilarity = require('../models/ItemSimilarity');

async function run() {
    const uri = process.env.MONGO_URI;
    await connectDB(uri);

    // Чистим (только для разработки)
    await Promise.all([
        User.deleteMany({}),
        Product.deleteMany({}),
        Interaction.deleteMany({}),
        Cart.deleteMany({}),
        Order.deleteMany({}),
        ItemSimilarity.deleteMany({})
    ]);

    const pwd = await bcrypt.hash('Passw0rd!', 10);

    // Users
    const users = [
        { _id: 'u_100', email: 'alice@example.com', name: 'Alice', segments: ['new', 'electronics'], password: pwd },
        { _id: 'u_101', email: 'bob@example.com', name: 'Bob', segments: ['electronics'], password: pwd },
        { _id: 'u_102', email: 'carol@example.com', name: 'Carol', segments: ['home'], password: pwd }
    ];
    await User.insertMany(users);

    // Products
    const products = [
        { _id: 'p_200', name: 'Logitech MX Keys', description: 'Wireless keyboard', categoryId: 'c_10', categoryName: 'Keyboards', price: 120, brand: 'Logitech', rating: 4.7, attrs: { layout: 'US', wireless: true } },
        { _id: 'p_201', name: 'Logitech MX Master 3S', description: 'Wireless mouse', categoryId: 'c_11', categoryName: 'Mice', price: 99, brand: 'Logitech', rating: 4.8, attrs: { dpi: 8000, wireless: true } },
        { _id: 'p_202', name: 'Keychron K2', description: 'Mechanical keyboard', categoryId: 'c_10', categoryName: 'Keyboards', price: 89, brand: 'Keychron', rating: 4.5, attrs: { layout: 'US', wireless: true } },
        { _id: 'p_203', name: 'Razer DeathAdder', description: 'Gaming mouse', categoryId: 'c_11', categoryName: 'Mice', price: 59, brand: 'Razer', rating: 4.3, attrs: { dpi: 6400, wireless: false } }
    ];
    await Product.insertMany(products);

    // Interactions
    const now = new Date();
    const interactions = [
        { userId: 'u_100', productId: 'p_200', type: 'view', ts: new Date(now - 1000 * 60 * 60) },
        { userId: 'u_100', productId: 'p_200', type: 'like', ts: new Date(now - 1000 * 50 * 60) },
        { userId: 'u_100', productId: 'p_201', type: 'view', ts: new Date(now - 1000 * 40 * 60) },
        { userId: 'u_100', productId: 'p_202', type: 'purchase', ts: new Date(now - 1000 * 30 * 60), value: 6 },

        { userId: 'u_101', productId: 'p_200', type: 'view', ts: new Date(now - 1000 * 55 * 60) },
        { userId: 'u_101', productId: 'p_201', type: 'like', ts: new Date(now - 1000 * 20 * 60) },
        { userId: 'u_101', productId: 'p_202', type: 'add_to_cart', ts: new Date(now - 1000 * 15 * 60), value: 4 },

        { userId: 'u_102', productId: 'p_203', type: 'view', ts: new Date(now - 1000 * 25 * 60) },
        { userId: 'u_102', productId: 'p_201', type: 'purchase', ts: new Date(now - 1000 * 10 * 60), value: 6 }
    ];
    await Interaction.insertMany(interactions);

    // Cart
    await Cart.create({
        _id: 'cart_u_100',
        userId: 'u_100',
        items: [{ productId: 'p_201', qty: 1, price: 99 }],
        updatedAt: new Date()
    });

    // Order
    await Order.create({
        _id: 'o_500',
        userId: 'u_100',
        items: [{ productId: 'p_202', qty: 1, price: 89 }],
        total: 89,
        status: 'paid',
        createdAt: new Date(now - 1000 * 30 * 60)
    });

    // Item similarities (заглушка для демо)
    await ItemSimilarity.insertMany([
        { productId: 'p_200', neighbors: [{ productId: 'p_202', sim: 0.81 }, { productId: 'p_201', sim: 0.72 }], updatedAt: new Date() },
        { productId: 'p_201', neighbors: [{ productId: 'p_200', sim: 0.72 }, { productId: 'p_203', sim: 0.60 }], updatedAt: new Date() }
    ]);

    console.log('✅ Seed completed');
    process.exit(0);
}

run().catch(e => {
    console.error('❌ Seed error:', e);
    process.exit(1);
});