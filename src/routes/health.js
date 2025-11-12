const { Router } = require('express');
const router = Router();

router.get('/ping', (_req, res) => {
    res.json({ ok: true, message: 'pong', time: new Date().toISOString() });
});

module.exports = router;