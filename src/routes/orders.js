/**
 * @openapi
 * /api/orders/checkout:
 *   post:
 *     summary: Checkout (creates order, writes purchase interactions)
 *     tags: [Orders]
 *     responses:
 *       201: { description: Created }
 *
 * /api/orders/me:
 *   get:
 *     summary: Get my orders (history)
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */

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
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */



const { Router } = require('express');
const { checkout, myOrders } = require('../controllers/api');
const router = Router();

router.post('/checkout', checkout);
router.get('/me', myOrders); // ?userId=u_100

module.exports = router;
