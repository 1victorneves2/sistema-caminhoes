const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const { verificarPermissao } = require('../middlewares/verificarPermissao');
const EstatisticasController = require('../controllers/estatisticasController');

router.get('/dia',    verificarToken, verificarEmpresa, verificarPermissao('estatisticas', 'listar'), EstatisticasController.obterDia);
router.get('/semana', verificarToken, verificarEmpresa, verificarPermissao('estatisticas', 'listar'), EstatisticasController.obterSemana);
router.get('/mes',    verificarToken, verificarEmpresa, verificarPermissao('estatisticas', 'listar'), EstatisticasController.obterMes);

module.exports = router;
