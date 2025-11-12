const { Schema, model } = require('mongoose');

const userSchema = new Schema(
    {
        _id: { type: String }, // например 'u_100'
        email: { type: String, required: true, lowercase: true, trim: true },
        name: { type: String, required: true, trim: true },
        segments: [{ type: String }],
        lastSeenAt: { type: Date },
        // password: { type: String, required: true, select: false },
        password: { type: String, select: false },
        resetToken: { type: String },
        resetExpiresAt: { type: Date }
    },
    { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, versionKey: false }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ segments: 1 });

module.exports = model('User', userSchema, 'users');