/**
 * @openapi
 * /api/cart:
 *   get:
 *     summary: Get the authenticated user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 data:
 *                   $ref: '#/components/schemas/CartSummary'
 * /api/cart/items:
 *   post:
 *     summary: Add or increment a product in the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CartItemInput'
 *     responses:
 *       200:
 *         description: Updated cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 data:
 *                   $ref: '#/components/schemas/CartSummary'
 * /api/cart/items/{productId}:
 *   patch:
 *     summary: Update quantity for an item in the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [qty]
 *             properties:
 *               qty:
 *                 type: integer
 *                 minimum: 0
 *                 description: "Set to zero to remove the item"
 *     responses:
 *       200:
 *         description: Updated cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 data:
 *                   $ref: '#/components/schemas/CartSummary'
 *   delete:
 *     summary: Remove an item from the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Updated cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 data:
 *                   $ref: '#/components/schemas/CartSummary'
 */

const { Router } = require('express');
const { authRequired } = require('../middleware/auth');
const {
    getMyCart,
    addCartItem,
    updateCartItem,
    removeCartItem,
} = require('../controllers/cart');

const router = Router();

router.get('/', authRequired, getMyCart);
router.post('/items', authRequired, addCartItem);
router.patch('/items/:productId', authRequired, updateCartItem);
router.delete('/items/:productId', authRequired, removeCartItem);

module.exports = router;
