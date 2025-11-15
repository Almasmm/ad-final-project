const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new Schema(
    {
        _id: { type: String },
        email: { type: String, required: true, lowercase: true, trim: true },
        name: { type: String, required: true, trim: true },
        role: { type: String, enum: ['user', 'admin'], default: 'user' },
        emailVerified: { type: Boolean, default: false },
        interests: [{ type: String }],
        segments: [{ type: String }],
        wishlist: [{ type: String }],
        viewHistory: [{
            productId: { type: String, required: true },
            ts: { type: Date, default: Date.now }
        }],
        purchaseHistory: [{
            orderId: { type: String, required: true },
            productId: { type: String, required: true },
            qty: { type: Number, default: 1 },
            price: { type: Number, required: true },
            ts: { type: Date, default: Date.now }
        }],
        cachedRecommendations: [{
            productId: { type: String, required: true },
            score: { type: Number, default: 0 },
            ts: { type: Date, default: Date.now }
        }],
        lastSeenAt: { type: Date },
        password: { type: String, required: true, select: false },
        resetToken: { type: String },
        resetExpiresAt: { type: Date },
        emailVerificationCode: { type: String },
        emailVerificationExpiresAt: { type: Date },
        refreshTokens: [{
            token: { type: String },
            tokenId: { type: String },
            expiresAt: { type: Date }
        }]
    },
    { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, versionKey: false }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ segments: 1 });
userSchema.index({ interests: 1 });
userSchema.index({ 'refreshTokens.token': 1 });
userSchema.index({ 'refreshTokens.tokenId': 1 });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = model('User', userSchema, 'users');
