const { Router } = require('express');
const { createInteraction } = require('../controllers/api');
const router = Router();

router.post('/', createInteraction);

module.exports = router;
