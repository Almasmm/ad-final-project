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
 *     security:
 *       - bearerAuth: []
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
const {
    createUser,
    getUser,
    getUserHistory,
    getMyProfile,
    updateMyProfile,
    listUsers,
    adminUpdateUser,
    adminDeleteUser,
    getMyWishlist,
    removeFromWishlist,
} = require('../controllers/api');
const { authRequired, requireRole } = require('../middleware/auth');

const router = Router();

router.post('/', createUser);          // registration
router.get('/me', authRequired, getMyProfile);
router.patch('/me', authRequired, updateMyProfile);
router.get('/me/wishlist', authRequired, getMyWishlist);
router.delete('/me/wishlist/:productId', authRequired, removeFromWishlist);

router.get('/', requireRole('admin'), listUsers);
router.patch('/:id', requireRole('admin'), adminUpdateUser);
router.delete('/:id', requireRole('admin'), adminDeleteUser);

router.get('/:id', getUser);           // profile lookup
router.get('/:id/history', authRequired, getUserHistory); // owner-only history

module.exports = router;
