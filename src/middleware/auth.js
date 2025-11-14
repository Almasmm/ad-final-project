const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

function authRequired(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, error: 'No token' });

    try {
        const payload = jwt.verify(token, JWT_SECRET); // { sub: userId, ... }
        req.auth = { userId: payload.sub };
        next();
    } catch (e) {
        return res.status(401).json({ ok: false, error: 'Invalid token' });
    }
}

module.exports = { authRequired };
