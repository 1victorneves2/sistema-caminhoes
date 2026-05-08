const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const { verificarPermissao } = require('../middlewares/verificarPermissao');
const CarregamentoController = require('../controllers/carregamentoController');

router.get('/financeiro',               verificarToken, verificarEmpresa, verificarPermissao('financeiro',    'listar'),           CarregamentoController.listarFinanceiro);
router.get('/minhas-entregas',          verificarToken, verificarEmpresa,                                                          CarregamentoController.minhasEntregas);
router.get('/',                         verificarToken, verificarEmpresa, verificarPermissao('carregamentos', 'listar'),           CarregamentoController.listar);
router.post('/',                        verificarToken, verificarEmpresa, verificarPermissao('carregamentos', 'criar'),            CarregamentoController.criar);
router.get('/:id',                      verificarToken, verificarEmpresa, verificarPermissao('carregamentos', 'listar'),           CarregamentoController.buscarDetalhes);
router.put('/:id/finalizar',            verificarToken, verificarEmpresa, verificarPermissao('carregamentos', 'finalizar'),        CarregamentoController.finalizar);
router.put('/:id/motorista-status',     verificarToken, verificarEmpresa,                                                          CarregamentoController.atualizarStatusMotorista);
router.put('/:id/transferir-problemas', verificarToken, verificarEmpresa, verificarPermissao('carregamentos', 'transferir_notas'), CarregamentoController.transferirProblemas);
router.put('/:id/status-financeiro',    verificarToken, verificarEmpresa, verificarPermissao('financeiro',    'aprovar'),          CarregamentoController.atualizarStatusFinanceiro);

module.exports = router;
