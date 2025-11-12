/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Create user (registration profile)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name]
 *             properties:
 *               id: { type: string }
 *               email: { type: string }
 *               name: { type: string }
 *               segments:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201: { description: Created }
 *
 * /api/users/{id}:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *
 * /api/users/{id}/history:
 *   get:
 *     summary: Get user history (interactions + orders)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: since
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: OK }
 */

const { Router } = require('express');
const { createUser, getUser, getUserHistory } = require('../controllers/api');
const router = Router();

router.post('/', createUser);          // регистрация
router.get('/:id', getUser);           // профиль
router.get('/:id/history', getUserHistory); // 💥 история (взаим-я + заказы)

module.exports = router;
