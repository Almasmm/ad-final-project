const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new Schema(
    {
        _id: { type: String }, // 'u_100' и т.д.
        email: { type: String, required: true, lowercase: true, trim: true },
        name: { type: String, required: true, trim: true },
        segments: [{ type: String }],
        lastSeenAt: { type: Date },

        // 🔐 Auth
        password: { type: String, required: true, select: false },
        resetToken: { type: String },        // 6-значный код (демо)
        resetExpiresAt: { type: Date }       // дата истечения кода
    },
    { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, versionKey: false }
);

// Индексы
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ segments: 1 });

// Хеш пароля перед сохранением
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Сравнение пароля
userSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = model('User', userSchema, 'users');
