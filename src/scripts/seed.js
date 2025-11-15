require('dotenv').config();
const bcrypt = require('bcryptjs');

const { connectDB } = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const Interaction = require('../models/Interaction');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const ItemSimilarity = require('../models/ItemSimilarity');

const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000);

async function seedQualityData() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGO_URI is not set');
    }

    await connectDB(uri);

    console.log('[seed] Clearing collections...');
    await Promise.all([
        User.deleteMany({}),
        Product.deleteMany({}),
        Interaction.deleteMany({}),
        Cart.deleteMany({}),
        Order.deleteMany({}),
        ItemSimilarity.deleteMany({})
    ]);
    console.log('[seed] Collections cleared. Loading curated data...');

    const passwordHash = await bcrypt.hash('TasteTest#2024', 10);
    const now = new Date();

    const products = [
        {
            _id: 'p_101',
            name: 'Breville Barista Express Impress',
            description: 'Stainless steel espresso station with assisted tamping and automatic dosing.',
            categoryId: 'coffee',
            categoryName: 'Specialty Coffee',
            category: 'Appliances',
            price: 749,
            brand: 'Breville',
            rating: 4.9,
            tags: ['espresso', 'kitchen', 'premium'],
            attrs: { material: 'stainless steel', includesGrinder: true, pressureBars: 15 }
        },
        {
            _id: 'p_102',
            name: 'Fellow Stagg EKG Pro Electric Kettle',
            description: 'Variable temperature pour-over kettle with guided brewing modes.',
            categoryId: 'coffee',
            categoryName: 'Specialty Coffee',
            category: 'Kitchen Tools',
            price: 195,
            brand: 'Fellow',
            rating: 4.8,
            tags: ['kettle', 'pour-over', 'electric'],
            attrs: { capacityLiters: 0.9, color: 'matte black', connectivity: 'Wi-Fi' }
        },
        {
            _id: 'p_103',
            name: 'Our Place Always Pan 2.0',
            description: 'Non-toxic ceramic pan that replaces eight pieces of cookware.',
            categoryId: 'kitchen',
            categoryName: 'Cookware',
            category: 'Kitchen Tools',
            price: 150,
            brand: 'Our Place',
            rating: 4.6,
            tags: ['cookware', 'ceramic', 'multifunctional'],
            attrs: { material: 'ceramic', diameterCm: 28, inductionReady: true }
        },
        {
            _id: 'p_104',
            name: 'Vitruvi Stone Essential Oil Diffuser',
            description: 'Minimalist porcelain diffuser for scenting living spaces.',
            categoryId: 'wellness',
            categoryName: 'Aromatherapy',
            category: 'Home',
            price: 123,
            brand: 'Vitruvi',
            rating: 4.7,
            tags: ['diffuser', 'home fragrance', 'decor'],
            attrs: { runTimeHours: 7.5, finish: 'terracotta', autoShutoff: true }
        },
        {
            _id: 'p_105',
            name: 'Philips Hue White & Color Ambiance Starter Kit',
            description: 'Four smart bulbs with bridge for scenes and automations.',
            categoryId: 'smart-home',
            categoryName: 'Smart Home',
            category: 'Lighting',
            price: 189,
            brand: 'Philips Hue',
            rating: 4.5,
            tags: ['lighting', 'smart', 'voice-control'],
            attrs: { bulbs: 4, supportsMatter: true, voiceAssistants: ['Alexa', 'Google', 'Siri'] }
        },
        {
            _id: 'p_106',
            name: 'Sonos Era 100 Smart Speaker',
            description: 'Wi-Fi speaker with spatial audio and Trueplay tuning.',
            categoryId: 'audio',
            categoryName: 'Home Audio',
            category: 'Electronics',
            price: 249,
            brand: 'Sonos',
            rating: 4.8,
            tags: ['speaker', 'wireless', 'hi-fi'],
            attrs: { microphones: true, bluetooth: true, finish: 'matte black' }
        },
        {
            _id: 'p_107',
            name: 'Hedley & Bennett Essential Apron',
            description: 'Durable cotton apron favored by professional kitchens.',
            categoryId: 'kitchen',
            categoryName: 'Kitchen Textiles',
            category: 'Accessories',
            price: 95,
            brand: 'Hedley & Bennett',
            rating: 4.4,
            tags: ['apron', 'chef', 'textile'],
            attrs: { material: 'cotton canvas', adjustable: true, origin: 'USA' }
        },
        {
            _id: 'p_108',
            name: 'Le Labo Santal 26 Candle',
            description: 'Hand-poured soy wax candle with signature Santal 26 scent.',
            categoryId: 'wellness',
            categoryName: 'Candles',
            category: 'Home Fragrance',
            price: 84,
            brand: 'Le Labo',
            rating: 4.9,
            tags: ['candle', 'luxury', 'gift'],
            attrs: { burnTimeHours: 60, wax: 'soy', vessel: 'glass' }
        }
    ];

    const orders = [
        {
            _id: 'o_3001',
            userId: 'u_elena',
            items: [
                { productId: 'p_101', qty: 1, price: 749 },
                { productId: 'p_102', qty: 1, price: 195 }
            ],
            total: 944,
            status: 'paid',
            createdAt: hoursAgo(48)
        },
        {
            _id: 'o_3002',
            userId: 'u_marat',
            items: [
                { productId: 'p_105', qty: 1, price: 189 },
                { productId: 'p_107', qty: 1, price: 95 }
            ],
            total: 284,
            status: 'paid',
            createdAt: hoursAgo(30)
        },
        {
            _id: 'o_3003',
            userId: 'u_sofia',
            items: [
                { productId: 'p_103', qty: 1, price: 150 },
                { productId: 'p_108', qty: 1, price: 84 }
            ],
            total: 234,
            status: 'paid',
            createdAt: hoursAgo(60)
        },
        {
            _id: 'o_3004',
            userId: 'u_ilya',
            items: [{ productId: 'p_106', qty: 1, price: 249 }],
            total: 249,
            status: 'paid',
            createdAt: hoursAgo(12)
        }
    ];

    const users = [
        {
            _id: 'u_elena',
            email: 'elena.ivanova@atelier.ru',
            name: 'Elena Ivanova',
            role: 'admin',
            emailVerified: true,
            segments: ['coffee', 'design', 'vip'],
            interests: ['espresso', 'tableware', 'smart lighting'],
            wishlist: ['p_105', 'p_108'],
            viewHistory: [
                { productId: 'p_101', ts: hoursAgo(72) },
                { productId: 'p_105', ts: hoursAgo(4) }
            ],
            purchaseHistory: [
                { orderId: 'o_3001', productId: 'p_101', qty: 1, price: 749, ts: hoursAgo(48) },
                { orderId: 'o_3001', productId: 'p_102', qty: 1, price: 195, ts: hoursAgo(47.5) }
            ],
            cachedRecommendations: [
                { productId: 'p_104', score: 0.91, ts: hoursAgo(2) },
                { productId: 'p_108', score: 0.87, ts: hoursAgo(2) }
            ],
            lastSeenAt: hoursAgo(1.5),
            password: passwordHash
        },
        {
            _id: 'u_marat',
            email: 'marat.kadyrov@crafthouse.kz',
            name: 'Marat Kadyrov',
            emailVerified: true,
            segments: ['smart-home', 'family'],
            interests: ['lighting', 'kitchen tech'],
            wishlist: ['p_101'],
            viewHistory: [
                { productId: 'p_105', ts: hoursAgo(32) },
                { productId: 'p_106', ts: hoursAgo(18) }
            ],
            purchaseHistory: [
                { orderId: 'o_3002', productId: 'p_105', qty: 1, price: 189, ts: hoursAgo(30) },
                { orderId: 'o_3002', productId: 'p_107', qty: 1, price: 95, ts: hoursAgo(29.5) }
            ],
            cachedRecommendations: [{ productId: 'p_101', score: 0.78, ts: hoursAgo(6) }],
            lastSeenAt: hoursAgo(0.5),
            password: passwordHash
        },
        {
            _id: 'u_sofia',
            email: 'sofia.minaeva@dailyhome.ru',
            name: 'Sofia Minaeva',
            emailVerified: true,
            segments: ['editor', 'home-chef'],
            interests: ['ceramics', 'candles', 'kitchen'],
            wishlist: ['p_103', 'p_104'],
            viewHistory: [
                { productId: 'p_103', ts: hoursAgo(70) },
                { productId: 'p_104', ts: hoursAgo(8) }
            ],
            purchaseHistory: [
                { orderId: 'o_3003', productId: 'p_103', qty: 1, price: 150, ts: hoursAgo(60) },
                { orderId: 'o_3003', productId: 'p_108', qty: 1, price: 84, ts: hoursAgo(59.5) }
            ],
            cachedRecommendations: [{ productId: 'p_102', score: 0.74, ts: hoursAgo(5) }],
            lastSeenAt: hoursAgo(4),
            password: passwordHash
        },
        {
            _id: 'u_ilya',
            email: 'ilya.stepanov@hifi.ua',
            name: 'Ilya Stepanov',
            emailVerified: true,
            segments: ['audio', 'tech'],
            interests: ['hi-fi', 'wireless', 'espresso'],
            wishlist: ['p_101', 'p_106'],
            viewHistory: [
                { productId: 'p_106', ts: hoursAgo(14) },
                { productId: 'p_101', ts: hoursAgo(13) }
            ],
            purchaseHistory: [
                { orderId: 'o_3004', productId: 'p_106', qty: 1, price: 249, ts: hoursAgo(12) }
            ],
            cachedRecommendations: [{ productId: 'p_102', score: 0.69, ts: hoursAgo(3) }],
            lastSeenAt: hoursAgo(2),
            password: passwordHash
        },
        {
            _id: 'u_alina',
            email: 'alina.ismailova@slowmorning.az',
            name: 'Alina Ismailova',
            emailVerified: false,
            segments: ['wellness', 'gifting'],
            interests: ['aromatherapy', 'tea rituals'],
            wishlist: ['p_108', 'p_104'],
            viewHistory: [
                { productId: 'p_104', ts: hoursAgo(6) },
                { productId: 'p_108', ts: hoursAgo(5.5) }
            ],
            purchaseHistory: [],
            cachedRecommendations: [{ productId: 'p_103', score: 0.75, ts: hoursAgo(1) }],
            lastSeenAt: hoursAgo(0.8),
            password: passwordHash
        },
        {
            _id: 'u_kurban',
            email: 'kurban.mamedov@atelier.az',
            name: 'Kurban Mamedov',
            emailVerified: false,
            segments: ['coffee', 'gifting'],
            interests: ['espresso', 'sound'],
            wishlist: ['p_101'],
            viewHistory: [
                { productId: 'p_101', ts: hoursAgo(24) },
                { productId: 'p_102', ts: hoursAgo(2.5) }
            ],
            purchaseHistory: [],
            cachedRecommendations: [{ productId: 'p_105', score: 0.66, ts: hoursAgo(1.2) }],
            lastSeenAt: hoursAgo(1),
            password: passwordHash
        }
    ];

    const carts = [
        {
            _id: 'cart_u_marat',
            userId: 'u_marat',
            items: [{ productId: 'p_106', qty: 1, price: 249 }],
            updatedAt: hoursAgo(6)
        },
        {
            _id: 'cart_u_alina',
            userId: 'u_alina',
            items: [
                { productId: 'p_104', qty: 1, price: 123 },
                { productId: 'p_108', qty: 2, price: 84 }
            ],
            updatedAt: hoursAgo(5)
        },
        {
            _id: 'cart_u_kurban',
            userId: 'u_kurban',
            items: [{ productId: 'p_101', qty: 1, price: 749 }],
            updatedAt: hoursAgo(1.5)
        }
    ];

    const interactions = [
        { userId: 'u_elena', productId: 'p_101', type: 'view', ts: hoursAgo(72), value: 1 },
        { userId: 'u_elena', productId: 'p_101', type: 'purchase', ts: hoursAgo(48), value: 6 },
        { userId: 'u_elena', productId: 'p_102', type: 'purchase', ts: hoursAgo(47.5), value: 6 },
        { userId: 'u_elena', productId: 'p_104', type: 'view', ts: hoursAgo(6), value: 1 },
        { userId: 'u_elena', productId: 'p_105', type: 'like', ts: hoursAgo(4), value: 2 },
        { userId: 'u_elena', productId: 'p_108', type: 'add_to_cart', ts: hoursAgo(3.5), value: 4 },

        { userId: 'u_marat', productId: 'p_105', type: 'view', ts: hoursAgo(32), value: 1 },
        { userId: 'u_marat', productId: 'p_105', type: 'purchase', ts: hoursAgo(30), value: 6 },
        { userId: 'u_marat', productId: 'p_107', type: 'purchase', ts: hoursAgo(29.5), value: 6 },
        { userId: 'u_marat', productId: 'p_101', type: 'like', ts: hoursAgo(20), value: 2 },
        { userId: 'u_marat', productId: 'p_106', type: 'view', ts: hoursAgo(18), value: 1 },
        { userId: 'u_marat', productId: 'p_106', type: 'add_to_cart', ts: hoursAgo(10), value: 4 },

        { userId: 'u_sofia', productId: 'p_103', type: 'view', ts: hoursAgo(70), value: 1 },
        { userId: 'u_sofia', productId: 'p_103', type: 'purchase', ts: hoursAgo(60), value: 6 },
        { userId: 'u_sofia', productId: 'p_108', type: 'purchase', ts: hoursAgo(59.5), value: 6 },
        { userId: 'u_sofia', productId: 'p_104', type: 'view', ts: hoursAgo(8), value: 1 },
        { userId: 'u_sofia', productId: 'p_105', type: 'like', ts: hoursAgo(7), value: 2 },

        { userId: 'u_ilya', productId: 'p_106', type: 'view', ts: hoursAgo(14), value: 1 },
        { userId: 'u_ilya', productId: 'p_106', type: 'purchase', ts: hoursAgo(12), value: 6 },
        { userId: 'u_ilya', productId: 'p_101', type: 'view', ts: hoursAgo(13), value: 1 },
        { userId: 'u_ilya', productId: 'p_102', type: 'add_to_cart', ts: hoursAgo(12.5), value: 4 },
        { userId: 'u_ilya', productId: 'p_104', type: 'view', ts: hoursAgo(9), value: 1 },

        { userId: 'u_alina', productId: 'p_104', type: 'view', ts: hoursAgo(6), value: 1 },
        { userId: 'u_alina', productId: 'p_108', type: 'add_to_cart', ts: hoursAgo(5.5), value: 4 },
        { userId: 'u_alina', productId: 'p_103', type: 'like', ts: hoursAgo(5), value: 2 },
        { userId: 'u_alina', productId: 'p_105', type: 'view', ts: hoursAgo(4.5), value: 1 },

        { userId: 'u_kurban', productId: 'p_101', type: 'view', ts: hoursAgo(24), value: 1 },
        { userId: 'u_kurban', productId: 'p_101', type: 'view', ts: hoursAgo(3), value: 1 },
        { userId: 'u_kurban', productId: 'p_102', type: 'view', ts: hoursAgo(2.5), value: 1 },
        { userId: 'u_kurban', productId: 'p_101', type: 'add_to_cart', ts: hoursAgo(2), value: 4 },
        { userId: 'u_kurban', productId: 'p_106', type: 'like', ts: hoursAgo(1.2), value: 2 }
    ];

    const itemSimilarities = [
        {
            productId: 'p_101',
            neighbors: [
                { productId: 'p_102', sim: 0.83 },
                { productId: 'p_103', sim: 0.66 }
            ],
            updatedAt: now
        },
        {
            productId: 'p_102',
            neighbors: [
                { productId: 'p_101', sim: 0.83 },
                { productId: 'p_104', sim: 0.58 }
            ],
            updatedAt: now
        },
        {
            productId: 'p_103',
            neighbors: [
                { productId: 'p_104', sim: 0.71 },
                { productId: 'p_108', sim: 0.52 }
            ],
            updatedAt: now
        },
        {
            productId: 'p_105',
            neighbors: [
                { productId: 'p_106', sim: 0.77 },
                { productId: 'p_101', sim: 0.49 }
            ],
            updatedAt: now
        }
    ];

    await Product.insertMany(products);
    await Order.insertMany(orders);
    await User.insertMany(users);
    await Cart.insertMany(carts);
    await Interaction.insertMany(interactions);
    await ItemSimilarity.insertMany(itemSimilarities);

    console.log(
        `[seed] Completed. users=${users.length}, products=${products.length}, orders=${orders.length}, carts=${carts.length}, interactions=${interactions.length}, similarities=${itemSimilarities.length}`
    );
    process.exit(0);
}

seedQualityData().catch((err) => {
    console.error('[seed] Failed to seed database:', err);
    process.exit(1);
});
