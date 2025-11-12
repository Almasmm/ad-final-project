const { Router } = require('express');
const { createUser, getUser, getUserHistory } = require('../controllers/api');
const router = Router();

router.post('/', createUser);          // регистрация
router.get('/:id', getUser);           // профиль
router.get('/:id/history', getUserHistory); // 💥 история (взаим-я + заказы)

module.exports = router;
