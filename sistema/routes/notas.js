const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const NotaController = require('../controllers/notaController');

// Rotas específicas ANTES das dinâmicas para evitar conflito de parâmetros
router.get('/:carregamento_id/stats',                      verificarToken, verificarEmpresa,               NotaController.obterStats);
router.post('/:carregamento_id/lote',                      verificarToken, verificarEmpresa, verificarAdmin, NotaController.criarEmLote);
router.put('/:carregamento_id/notas/:nota_id/status',      verificarToken, verificarEmpresa,               NotaController.atualizarStatus);

router.get('/:carregamento_id',                            verificarToken, verificarEmpresa,               NotaController.listar);
router.post('/:carregamento_id',                           verificarToken, verificarEmpresa, verificarAdmin, NotaController.criar);

module.exports = router;
