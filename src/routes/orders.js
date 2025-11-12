const { Router } = require('express');
const { checkout, myOrders } = require('../controllers/api');
const router = Router();

router.post('/checkout', checkout);
router.get('/me', myOrders); // ?userId=u_100

module.exports = router;
