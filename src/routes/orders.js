/**
 * @openapi
 * /api/orders/checkout:
 *   post:
 *     summary: Checkout (creates order, writes purchase interactions)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Checkout'
 *     responses:
 *       201: { description: Created }
 *
 * /api/orders/me:
 *   get:
 *     summary: Get my orders (history)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: OK }
 */



const { Router } = require('express');
const { checkout, myOrders } = require('../controllers/api');
const { authRequired } = require('../middleware/auth');
const router = Router();

router.post('/checkout', authRequired, checkout);
router.get('/me', authRequired, myOrders);

module.exports = router;
