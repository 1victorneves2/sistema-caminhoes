const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const { verificarPermissao } = require('../middlewares/verificarPermissao');
const NotaController = require('../controllers/notaController');

// Rotas específicas ANTES das dinâmicas para evitar conflito de parâmetros
router.get('/:carregamento_id/stats',                 verificarToken, verificarEmpresa, verificarPermissao('notas', 'listar'),      NotaController.obterStats);
router.post('/:carregamento_id/lote',                 verificarToken, verificarEmpresa, verificarPermissao('notas', 'upload_lote'), NotaController.criarEmLote);
router.put('/:carregamento_id/notas/:nota_id/status', verificarToken, verificarEmpresa, verificarPermissao('notas', 'editar'),      NotaController.atualizarStatus);

router.get('/:carregamento_id',                       verificarToken, verificarEmpresa, verificarPermissao('notas', 'listar'),      NotaController.listar);
router.post('/:carregamento_id',                      verificarToken, verificarEmpresa, verificarPermissao('notas', 'criar'),       NotaController.criar);

module.exports = router;
