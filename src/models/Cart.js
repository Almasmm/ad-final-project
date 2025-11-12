const { Schema, model } = require('mongoose');

const cartItemSchema = new Schema(
    { productId: { type: String, required: true }, qty: { type: Number, min: 1, required: true }, price: { type: Number, min: 0, required: true } },
    { _id: false }
);

const cartSchema = new Schema(
    {
        _id: { type: String }, // cart_u_100
        userId: { type: String, required: true, unique: true, index: true },
        items: { type: [cartItemSchema], default: [] },
        updatedAt: { type: Date, default: Date.now }
    },
    { versionKey: false }
);

cartSchema.index({ userId: 1 }, { unique: true });

module.exports = model('Cart', cartSchema, 'carts');
