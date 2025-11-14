/**
 * @openapi
 * /api/interactions:
 *   post:
 *     summary: Write user interaction (view/like/add_to_cart/purchase)
 *     tags: [Interactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InteractionCreate'
 *     responses:
 *       201: { description: Created }
 */


const { Router } = require('express');
const { createInteraction } = require('../controllers/api');
const { authRequired } = require('../middleware/auth');
const router = Router();

router.post('/', authRequired, createInteraction);

module.exports = router;
