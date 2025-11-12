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
 *
 * /api/products/{id}/similar:
 *   get:
 *     summary: Get similar products
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */

/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: List products (search/filter/sort)
 *     tags: [Products]
 *     parameters: ...
 *     responses: { 200: { description: OK } }
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
 *   get: ...
 *   put:
 *     summary: Update product (admin)
 *     tags: [Products]
 *     parameters: ...
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductUpdate'
 *     responses:
 *       200: { description: OK }
 *   delete: ...
 */


const { Router } = require('express');
const { createProduct, listProducts, getProduct, updateProduct, deleteProduct } = require('../controllers/api');
const router = Router();

// админ CRUD
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

// публичные
router.get('/', listProducts);
router.get('/:id', getProduct);

module.exports = router;
