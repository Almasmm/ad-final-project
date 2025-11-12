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
