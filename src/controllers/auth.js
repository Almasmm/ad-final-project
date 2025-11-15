// src/controllers/auth.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendResetEmail, sendVerificationEmail } = require('../services/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const ACCESS_TTL = process.env.ACCESS_TTL || '15m';
const RESET_TTL_MINUTES = Number(process.env.RESET_TTL_MINUTES || 15);
const MIN_PASSWORD_LENGTH = Number(process.env.MIN_PASSWORD_LENGTH || 8);
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TTL_DAYS || 30);
const IS_PROD = process.env.NODE_ENV === 'production';
const MAX_REFRESH_TOKENS = Number(process.env.MAX_REFRESH_TOKENS || 5);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value = '') => value.trim().toLowerCase();
const normalizeName = (value = '') => value.trim();
const normalizeArrayField = (value) => {
    if (Array.isArray(value)) return value.map((s) => String(s || '').trim()).filter(Boolean);
    if (typeof value === 'string') {
        return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
};

const issueAccessToken = (user) => jwt.sign({ sub: user._id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TTL });
const generateRefreshToken = () => crypto.randomBytes(32).toString('hex');
const createVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex');

const respondValidationError = (res, message) => res.status(400).json({ ok: false, error: message });

function publicUser(user) {
    if (!user) return null;
    return {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        interests: user.interests || [],
        segments: user.segments || [],
        wishlist: user.wishlist || [],
        viewHistory: user.viewHistory || [],
        purchaseHistory: user.purchaseHistory || [],
        cachedRecommendations: user.cachedRecommendations || [],
        lastSeenAt: user.lastSeenAt || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

async function persistRefreshToken(user, rawToken) {
    const hashed = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    const tokenId = hashToken(rawToken);
    user.refreshTokens = (user.refreshTokens || []).filter((entry) => entry.expiresAt > new Date());
    user.refreshTokens.push({ token: hashed, tokenId, expiresAt });
    if (user.refreshTokens.length > MAX_REFRESH_TOKENS) {
        user.refreshTokens = user.refreshTokens.slice(-MAX_REFRESH_TOKENS);
    }
    await user.save();
    return { token: rawToken, expiresAt };
}

async function removeRefreshToken(user, rawToken) {
    if (!rawToken || !user) return;
    const tokenId = hashToken(rawToken);
    user.refreshTokens = (user.refreshTokens || []).filter((entry) => entry.tokenId !== tokenId);
    await user.save();
}

async function rotateRefreshToken(user, rawToken) {
    await removeRefreshToken(user, rawToken);
    const next = generateRefreshToken();
    const stored = await persistRefreshToken(user, next);
    return stored;
}

async function validateRefreshToken(rawToken) {
    if (!rawToken) return null;
    const tokenId = hashToken(rawToken);
    const user = await User.findOne({ 'refreshTokens.tokenId': tokenId });
    if (!user) return null;
    const entry = (user.refreshTokens || []).find((item) => item.tokenId === tokenId);
    if (!entry) return null;
    if (entry.expiresAt < new Date()) {
        await removeRefreshToken(user, rawToken);
        return null;
    }
    const match = await bcrypt.compare(rawToken, entry.token);
    if (!match) {
        await removeRefreshToken(user, rawToken);
        return null;
    }
    return { user, entry };
}

function buildTokensPayload(user, refreshToken) {
    const accessToken = issueAccessToken(user);
    return {
        ok: true,
        accessToken,
        token: accessToken,
        refreshToken: refreshToken.token,
        refreshExpiresAt: refreshToken.expiresAt,
        user: publicUser(user),
    };
}

// POST /auth/register
exports.register = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email || '');
        const name = normalizeName(req.body.name || '');
        const password = (req.body.password || '').trim();
        const segments = normalizeArrayField(req.body.segments);

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
            interests: normalizeArrayField(req.body.interests),
        });
        const code = createVerificationCode();
        user.emailVerificationCode = code;
        user.emailVerificationExpiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
        await user.save();
        await sendVerificationEmail({ to: email, code, expiresAt: user.emailVerificationExpiresAt });

        return res.status(201).json({ ok: true, message: 'Registration successful. Please verify your email before logging in.' });
    } catch (e) {
        console.error('register error', e);
        return res.status(500).json({ ok: false, error: e.message || 'Register failed' });
    }
};

// POST /auth/verify
exports.verifyEmail = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email || '');
        const code = String(req.body.code || '').trim();
        if (!email || !code) {
            return respondValidationError(res, 'email and code required');
        }
        const user = await User.findOne({ email });
        if (!user || !user.emailVerificationCode) {
            return res.status(400).json({ ok: false, error: 'Verification not requested' });
        }
        if (user.emailVerificationCode !== code) {
            return res.status(400).json({ ok: false, error: 'Invalid code' });
        }
        if (user.emailVerificationExpiresAt < new Date()) {
            return res.status(400).json({ ok: false, error: 'Code expired' });
        }
        user.emailVerified = true;
        user.emailVerificationCode = undefined;
        user.emailVerificationExpiresAt = undefined;
        await user.save();
        return res.json({ ok: true, message: 'Email verified. You can now log in.' });
    } catch (e) {
        console.error('verify error', e);
        return res.status(500).json({ ok: false, error: e.message || 'Verify failed' });
    }
};

// POST /auth/verify/resend
exports.resendVerification = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email || '');
        if (!email) {
            return respondValidationError(res, 'email required');
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ ok: true, message: 'Verification email sent (if account exists).' });
        }
        if (user.emailVerified) {
            return res.json({ ok: true, message: 'Email already verified.' });
        }
        const code = createVerificationCode();
        const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
        user.emailVerificationCode = code;
        user.emailVerificationExpiresAt = expiresAt;
        await user.save();

        const emailSent = await sendVerificationEmail({ to: email, code, expiresAt }).catch((err) => {
            console.error('resend verification email error', err);
            return false;
        });

        const payload = {
            ok: true,
            emailSent,
            message: emailSent ? 'Verification email sent.' : 'Email delivery not configured; code logged on server.',
        };

        if (!IS_PROD) {
            payload.demoCode = code;
            payload.expiresAt = expiresAt.toISOString();
        }

        return res.json(payload);
    } catch (e) {
        console.error('resend verification error', e);
        return res.status(500).json({ ok: false, error: e.message || 'Resend failed' });
    }
};

async function handleSuccessfulLogin(user, res) {
    const rawRefresh = generateRefreshToken();
    const stored = await persistRefreshToken(user, rawRefresh);
    return res.json(buildTokensPayload(user, stored));
}

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
        if (!user.emailVerified) {
            return res.status(403).json({ ok: false, error: 'Email not verified' });
        }

        const okPass = await user.comparePassword(password);
        if (!okPass) {
            return res.status(401).json({ ok: false, error: 'Invalid credentials' });
        }

        user.lastSeenAt = new Date();
        await user.save();
        return handleSuccessfulLogin(user, res);
    } catch (e) {
        console.error('login error', e);
        return res.status(500).json({ ok: false, error: e.message || 'Login failed' });
    }
};

// POST /auth/refresh
exports.refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body || {};
        const found = await validateRefreshToken(refreshToken);
        if (!found) {
            return res.status(401).json({ ok: false, error: 'Invalid refresh token' });
        }
        const { user } = found;
        const rotated = await rotateRefreshToken(user, refreshToken);
        return res.json(buildTokensPayload(user, rotated));
    } catch (e) {
        console.error('refresh error', e);
        return res.status(500).json({ ok: false, error: e.message || 'Refresh failed' });
    }
};

// POST /auth/logout
exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.body || {};
        if (!refreshToken) return res.json({ ok: true });
        const found = await validateRefreshToken(refreshToken);
        if (found) {
            await removeRefreshToken(found.user, refreshToken);
        }
        return res.json({ ok: true });
    } catch (e) {
        console.error('logout error', e);
        return res.status(500).json({ ok: false, error: e.message || 'Logout failed' });
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
            return res.json({ ok: true });
        }

        const code = createVerificationCode();
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
