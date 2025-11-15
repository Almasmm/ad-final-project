const { Router } = require('express');
const { similarProducts, recommendBundle } = require('../controllers/api');
const { authRequired } = require('../middleware/auth');

const router = Router();

router.get('/user/:id', authRequired, recommendBundle);
router.get('/similar/:id', similarProducts);

module.exports = router;
