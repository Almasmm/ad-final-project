const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signJwt(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });
}

function sixDigit() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /auth/register  {email, name, password}
exports.register = async (req, res) => {
    try {
        const { id, email, name, password, segments = [] } = req.body;
        if (!email || !name || !password) {
            return res.status(400).json({ ok: false, error: 'email, name, password required' });
        }
        const _id = id || `u_${Date.now()}`;
        const exists = await User.findOne({ email }).lean();
        if (exists) return res.status(409).json({ ok: false, error: 'Email already registered' });

        const user = await User.create({ _id, email, name, password, segments, lastSeenAt: new Date() });
        const token = signJwt({ sub: user._id });

        return res.status(201).json({
            ok: true,
            data: { id: user._id, email: user.email, name: user.name, segments: user.segments },
            token
        });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

// POST /auth/login  {email, password}
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ ok: false, error: 'email and password required' });

        const user = await User.findOne({ email }).select('+password');
        if (!user) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

        const ok = await user.comparePassword(password);
        if (!ok) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

        user.lastSeenAt = new Date();
        await user.save();

        const token = signJwt({ sub: user._id });
        return res.json({
            ok: true,
            data: { id: user._id, email: user.email, name: user.name, segments: user.segments },
            token
        });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

// POST /auth/forgot  {email}
exports.forgot = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ ok: false, error: 'email required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

        const code = sixDigit();
        const ttl = Number(process.env.RESET_TOKEN_TTL_MIN || 15);
        user.resetToken = code;
        user.resetExpiresAt = new Date(Date.now() + ttl * 60 * 1000);
        await user.save();

        // На проде отправили бы email/SMS. На защите покажем код прямо в ответе:
        return res.json({ ok: true, message: 'Reset code issued', demoCode: code, expiresInMin: ttl });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};

// POST /auth/reset  {email, code, newPassword}
exports.reset = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) {
            return res.status(400).json({ ok: false, error: 'email, code, newPassword required' });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user || !user.resetToken || !user.resetExpiresAt) {
            return res.status(400).json({ ok: false, error: 'No reset requested' });
        }
        if (user.resetToken !== code) return res.status(400).json({ ok: false, error: 'Invalid code' });
        if (user.resetExpiresAt < new Date()) return res.status(400).json({ ok: false, error: 'Code expired' });

        user.password = newPassword; // будет захешировано pre('save')
        user.resetToken = undefined;
        user.resetExpiresAt = undefined;
        await user.save();

        return res.json({ ok: true, message: 'Password updated' });
    } catch (e) {
        return res.status(400).json({ ok: false, error: e.message });
    }
};
