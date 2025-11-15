const UserHistory = require('../models/UserHistory');

const ALLOWED_ACTIONS = new Set(['view', 'like', 'cartAdd', 'purchase']);

async function logHistory({ userId, productId, action, meta }) {
    if (!userId || !productId || !ALLOWED_ACTIONS.has(action)) return;
    try {
        await UserHistory.create({
            userId,
            productId,
            action,
            meta,
            timestamp: new Date(),
        });
    } catch (err) {
        console.warn('[history] failed to log event', err.message);
    }
}

module.exports = { logHistory };
