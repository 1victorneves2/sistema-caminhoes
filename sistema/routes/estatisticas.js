const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const EstatisticasController = require('../controllers/estatisticasController');

router.get('/dia',    verificarToken, verificarEmpresa, EstatisticasController.obterDia);
router.get('/semana', verificarToken, verificarEmpresa, EstatisticasController.obterSemana);
router.get('/mes',    verificarToken, verificarEmpresa, EstatisticasController.obterMes);

module.exports = router;
