/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: List products (search/filter/sort)
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [rating_desc, price_asc, price_desc, newest]
 *     responses:
 *       200: { description: OK }
 *   post:
 *     summary: Create product (admin)
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCreate'
 *     responses:
 *       201: { description: Created }
 *
 * /api/products/{id}:
 *   get:
 *     summary: Get product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *   put:
 *     summary: Update product (admin)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductUpdate'
 *     responses:
 *       200: { description: OK }
 *   delete:
 *     summary: Delete product (admin)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */


const { Router } = require('express');
const { createProduct, listProducts, getProduct, getBoughtTogether, updateProduct, deleteProduct } = require('../controllers/api');
const { requireRole } = require('../middleware/auth');
const router = Router();

router.post('/', requireRole('admin'), createProduct);
router.put('/:id', requireRole('admin'), updateProduct);
router.delete('/:id', requireRole('admin'), deleteProduct);

router.get('/', listProducts);
router.get('/:id', getProduct);
router.get('/:id/bought-together', getBoughtTogether);

module.exports = router;
