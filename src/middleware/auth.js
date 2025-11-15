const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

function verifyToken(req) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
        const err = new Error('No token');
        err.status = 401;
        throw err;
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.auth = {
            userId: payload.sub,
            role: payload.role || 'user',
        };
        return req.auth;
    } catch (e) {
        const err = new Error('Invalid token');
        err.status = 401;
        throw err;
    }
}

function authRequired(req, res, next) {
    try {
        verifyToken(req);
        next();
    } catch (err) {
        res.status(err.status || 401).json({ ok: false, error: err.message });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        authRequired(req, res, () => {
            if (!req.auth || (roles.length && !roles.includes(req.auth.role))) {
                return res.status(403).json({ ok: false, error: 'Forbidden' });
            }
            next();
        });
    };
}

module.exports = { authRequired, requireRole };
