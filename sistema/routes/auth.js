const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { login, registrar, verificar, logout } = require('../controllers/authController');

router.post('/login', login);
router.post('/registrar', registrar);
router.get('/verificar', verificarToken, verificar);
router.post('/logout', verificarToken, logout);

module.exports = router;
