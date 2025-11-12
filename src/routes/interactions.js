/**
 * @openapi
 * /api/interactions:
 *   post:
 *     summary: Write user interaction (view/like/add_to_cart/purchase)
 *     tags: [Interactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, productId, type]
 *             properties:
 *               userId: { type: string }
 *               productId: { type: string }
 *               type:
 *                 type: string
 *                 enum: [view, like, add_to_cart, purchase]
 *               value: { type: number }
 *     responses:
 *       201: { description: Created }
 */


const { Router } = require('express');
const { createInteraction } = require('../controllers/api');
const router = Router();

router.post('/', createInteraction);

module.exports = router;
