const { Router } = require('express');
const { register, login, forgot, reset } = require('../controllers/auth');
const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication & Password reset
 *
 * /auth/register:
 *   post:
 *     summary: Register user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRegister'
 *     responses:
 *       201:
 *         description: Created
 *
 * /auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLogin'
 *     responses:
 *       200:
 *         description: OK
 *
 * /auth/forgot:
 *   post:
 *     summary: Request password reset code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthForgot'
 *     responses:
 *       200:
 *         description: OK
 *
 * /auth/reset:
 *   post:
 *     summary: Reset password by code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthReset'
 *     responses:
 *       200:
 *         description: OK
 */


router.post('/register', register);
router.post('/login', login);
router.post('/forgot', forgot);
router.post('/reset', reset);

module.exports = router;
