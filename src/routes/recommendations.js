/**
 * @openapi
 * /api/recommendations/{userId}:
 *   get:
 *     summary: Get recommendations for user (item-based CF)
 *     tags: [Recommendations]
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
const router = Router();

router.get('/products/:id/similar', similarProducts);
router.get('/recommendations/:userId', recommendForUser);

module.exports = router;
