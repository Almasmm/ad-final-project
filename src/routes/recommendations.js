const { Router } = require('express');
const { similarProducts, recommendForUser } = require('../controllers/api');
const router = Router();

router.get('/products/:id/similar', similarProducts);
router.get('/recommendations/:userId', recommendForUser);

module.exports = router;
