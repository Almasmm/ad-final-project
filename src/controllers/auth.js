// src/controllers/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendResetEmail } = require('../services/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const RESET_TTL_MINUTES = Number(process.env.RESET_TTL_MINUTES || 15);
const MIN_PASSWORD_LENGTH = Number(process.env.MIN_PASSWORD_LENGTH || 8);
const IS_PROD = process.env.NODE_ENV === 'production';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value = '') => value.trim().toLowerCase();
const normalizeName = (value = '') => value.trim();
const normalizeSegments = (value) => {
    if (Array.isArray(value)) {
        return value.map((s) => String(s || '').trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }
    return [];
};

const issueToken = (userId) => jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' });

function publicUser(user) {
    if (!user) return null;
    return {
        _id: user._id,
        email: user.email,
        name: user.name,
        segments: user.segments || [],
        lastSeenAt: user.lastSeenAt || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

const respondValidationError = (res, message) => res.status(400).json({ ok: false, error: message });

// POST /auth/register
exports.register = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email || '');
        const name = normalizeName(req.body.name || '');
        const password = (req.body.password || '').trim();
        const segments = normalizeSegments(req.body.segments);

        if (!email || !name || !password) {
            return respondValidationError(res, 'email, name, password required');
        }
        if (!emailRegex.test(email)) {
            return respondValidationError(res, 'invalid email');
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            return respondValidationError(res, `password must be at least ${MIN_PASSWORD_LENGTH} characters`);
        }

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(409).json({ ok: false, error: 'Email already registered' });
        }

        const user = new User({
            _id: `u_${Date.now()}`,
            email,
            name,
            segments,
            password,
            lastSeenAt: new Date(),
        });
        await user.save();

        const token = issueToken(user._id);
        return res.status(201).json({ ok: true, token, user: publicUser(user) });
    } catch (e) {
        console.error('register error', e);
        return res.status(500).json({ ok: false, error: e.message || 'Register failed' });
    }
};

// POST /auth/login
exports.login = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email || '');
        const password = (req.body.password || '').trim();
        if (!email || !password) {
            return respondValidationError(res, 'email and password required');
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ ok: false, error: 'Invalid credentials' });
        }

        const okPass = await user.comparePassword(password);
        if (!okPass) {
            return res.status(401).json({ ok: false, error: 'Invalid credentials' });
        }

        user.lastSeenAt = new Date();
        await user.save();

        const token = issueToken(user._id);
        return res.json({ ok: true, token, user: publicUser(user) });
    } catch (e) {
        console.error('login error', e);
        return res.status(500).json({ ok: false, error: e.message || 'Login failed' });
    }
};

// POST /auth/forgot
exports.forgot = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email || '');
        if (!email) {
            return respondValidationError(res, 'email required');
        }
        if (!emailRegex.test(email)) {
            return respondValidationError(res, 'invalid email');
        }

        const user = await User.findOne({ email });
        if (!user) {
            // intentionally return ok to avoid email enumeration
            return res.json({ ok: true });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

        user.resetToken = code;
        user.resetExpiresAt = expires;
        await user.save();

        const emailSent = await sendResetEmail({ to: email, code, expiresAt: expires }).catch((mailError) => {
            console.error('send reset email error', mailError);
            return false;
        });

        const responsePayload = {
            ok: true,
            emailSent,
        };

        if (!IS_PROD) {
            responsePayload.demoCode = code;
            responsePayload.expiresAt = expires.toISOString();
        }

        if (!emailSent) {
            responsePayload.message = 'Email delivery is not configured; code logged on the server.';
        }

        return res.json(responsePayload);
    } catch (e) {
        console.error('forgot error', e);
        return res.status(500).json({ ok: false, error: e.message || 'Forgot failed' });
    }
};

// POST /auth/reset
exports.reset = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email || '');
        const code = String(req.body.code || '').trim();
        const newPassword = (req.body.newPassword || '').trim();

        if (!email || !code || !newPassword) {
            return respondValidationError(res, 'email, code, newPassword required');
        }
        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            return respondValidationError(res, `newPassword must be at least ${MIN_PASSWORD_LENGTH} characters`);
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user || !user.resetToken || !user.resetExpiresAt) {
            return res.status(400).json({ ok: false, error: 'No reset requested' });
        }

        if (user.resetToken !== code) {
            return res.status(400).json({ ok: false, error: 'Invalid code' });
        }

        if (user.resetExpiresAt < new Date()) {
            return res.status(400).json({ ok: false, error: 'Code expired' });
        }

        user.password = newPassword;
        user.resetToken = undefined;
        user.resetExpiresAt = undefined;
        await user.save();

        return res.json({ ok: true });
    } catch (e) {
        console.error('reset error', e);
        return res.status(500).json({ ok: false, error: e.message || 'Reset failed' });
    }
};
