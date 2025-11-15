const { Schema, model } = require('mongoose');

const productSchema = new Schema(
    {
        _id: { type: String }, // 'p_200'
        name: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        categoryId: { type: String, index: true },
        categoryName: { type: String },
        category: { type: String, trim: true },
        price: { type: Number, required: true, min: 0 },
        brand: { type: String },
        rating: { type: Number, min: 0, max: 5, default: 0 },
        relatedProducts: { type: [String], default: [] },
        tags: { type: [String], default: [] },
        attrs: { type: Schema.Types.Mixed }
    },
    { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, versionKey: false }
);

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ categoryId: 1, price: 1 });
productSchema.index({ rating: -1, createdAt: -1 });
productSchema.index({ tags: 1 });

module.exports = model('Product', productSchema, 'products');
