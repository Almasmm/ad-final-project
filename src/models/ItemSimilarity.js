const { Schema, model } = require('mongoose');

const neighborSchema = new Schema(
    { productId: { type: String, required: true }, sim: { type: Number, min: 0, max: 1, required: true } },
    { _id: false }
);

const itemSimilaritySchema = new Schema(
    {
        productId: { type: String, required: true },
        neighbors: { type: [neighborSchema], default: [] },
        updatedAt: { type: Date, default: Date.now }
    },
    { versionKey: false }
);

itemSimilaritySchema.index({ productId: 1 }, { unique: true });

module.exports = model('ItemSimilarity', itemSimilaritySchema, 'item_similarities');
