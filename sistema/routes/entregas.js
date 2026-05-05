const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const { verificarPermissao } = require('../middlewares/verificarPermissao');
const EntregaController = require('../controllers/entregaController');

router.get('/ativas',             verificarToken, verificarEmpresa, verificarPermissao('entregas', 'listar_minhas'),    EntregaController.listarAtivas);
router.put('/:id/chegou',         verificarToken, verificarEmpresa, verificarPermissao('entregas', 'atualizar_status'), EntregaController.marcarChegada);
router.get('/:id/notas',          verificarToken, verificarEmpresa, verificarPermissao('entregas', 'listar_minhas'),    EntregaController.listarNotas);
router.put('/:id/notas/:nota_id', verificarToken, verificarEmpresa, verificarPermissao('entregas', 'atualizar_status'), EntregaController.atualizarNota);
router.post('/:id/finalizar',     verificarToken, verificarEmpresa, verificarPermissao('entregas', 'finalizar'),        EntregaController.finalizar);

module.exports = router;
