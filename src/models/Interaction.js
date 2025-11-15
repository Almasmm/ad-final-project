const { Schema, model } = require('mongoose');

const interactionSchema = new Schema(
    {
        userId: { type: String, required: true },
        productId: { type: String, required: true },
        type: { type: String, enum: ['view', 'like', 'add_to_cart', 'purchase'], required: true },
        ts: { type: Date, default: Date.now },
        value: { type: Number, default: 1 }
    },
    { versionKey: false }
);

interactionSchema.index({ userId: 1, ts: -1 });
interactionSchema.index({ productId: 1, userId: 1 });
interactionSchema.index({ type: 1, ts: -1 });

module.exports = model('Interaction', interactionSchema, 'interactions');
