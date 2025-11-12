const mongoose = require('mongoose');

async function connectDB(uri) {
    mongoose.set('strictQuery', true);
    try {
        await mongoose.connect(uri);
        console.log('✅ MongoDB connected:', mongoose.connection.name);
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    }
}

module.exports = { connectDB };
