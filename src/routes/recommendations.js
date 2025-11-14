/**
 * @openapi
 * /api/products/{id}/similar:
 *   get:
 *     summary: Get similar products for a given product
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *
 * /api/recommendations/{userId}:
 *   get:
 *     summary: Get personalized recommendations for user (item-based CF)
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: n
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: OK }
 */

const { Router } = require('express');
const { similarProducts, recommendForUser } = require('../controllers/api');
const { authRequired } = require('../middleware/auth');

const router = Router();

router.get('/products/:id/similar', similarProducts);
router.get('/recommendations/:userId', authRequired, recommendForUser);

module.exports = router;
