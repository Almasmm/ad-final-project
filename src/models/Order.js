const { Schema, model } = require('mongoose');

const orderItemSchema = new Schema(
    { productId: { type: String, required: true }, qty: { type: Number, min: 1, required: true }, price: { type: Number, min: 0, required: true } },
    { _id: false }
);

const orderSchema = new Schema(
    {
        _id: { type: String }, // 'o_500'
        userId: { type: String, required: true, index: true },
        items: { type: [orderItemSchema], default: [] },
        total: { type: Number, required: true, min: 0 },
        status: { type: String, enum: ['paid', 'cancelled', 'pending'], default: 'paid' },
        createdAt: { type: Date, default: Date.now }
    },
    { versionKey: false }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

module.exports = model('Order', orderSchema, 'orders');