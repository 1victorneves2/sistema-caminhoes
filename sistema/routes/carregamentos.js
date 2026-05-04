const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const CarregamentoController = require('../controllers/carregamentoController');

router.get('/financeiro',                   verificarToken, verificarEmpresa,               CarregamentoController.listarFinanceiro);
router.get('/',                             verificarToken, verificarEmpresa,               CarregamentoController.listar);
router.post('/',                            verificarToken, verificarEmpresa, verificarAdmin, CarregamentoController.criar);
router.get('/:id',                          verificarToken, verificarEmpresa,               CarregamentoController.buscarDetalhes);
router.put('/:id/finalizar',                verificarToken, verificarEmpresa, verificarAdmin, CarregamentoController.finalizar);
router.put('/:id/transferir-problemas',     verificarToken, verificarEmpresa,               CarregamentoController.transferirProblemas);
router.put('/:id/status-financeiro',        verificarToken, verificarEmpresa, verificarAdmin, CarregamentoController.atualizarStatusFinanceiro);

module.exports = router;
