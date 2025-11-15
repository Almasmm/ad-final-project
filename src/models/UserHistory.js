const { Schema, model } = require('mongoose');

const historySchema = new Schema(
    {
        userId: { type: String, required: true, index: true },
        productId: { type: String, required: true, index: true },
        action: { type: String, enum: ['view', 'like', 'cartAdd', 'purchase'], required: true, index: true },
        meta: { type: Schema.Types.Mixed },
        timestamp: { type: Date, default: Date.now, index: true },
    },
    { versionKey: false }
);

historySchema.index({ userId: 1, timestamp: -1 });
historySchema.index({ productId: 1, timestamp: -1 });

module.exports = model('UserHistory', historySchema, 'user_history');
