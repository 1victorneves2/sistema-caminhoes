const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const { verificarPermissao } = require('../middlewares/verificarPermissao');
const caminhaoController = require('../controllers/caminhaoController');

router.get('/',           verificarToken, verificarEmpresa, verificarPermissao('caminhoes', 'listar'),  caminhaoController.listar.bind(caminhaoController));
router.post('/',          verificarToken, verificarEmpresa, verificarPermissao('caminhoes', 'criar'),   caminhaoController.criar.bind(caminhaoController));
router.put('/:id',        verificarToken, verificarEmpresa, verificarPermissao('caminhoes', 'editar'),  caminhaoController.atualizar.bind(caminhaoController));
router.put('/:id/status', verificarToken, verificarEmpresa, verificarPermissao('caminhoes', 'editar'),  caminhaoController.atualizarStatus.bind(caminhaoController));
router.delete('/:id',     verificarToken, verificarEmpresa, verificarPermissao('caminhoes', 'deletar'), caminhaoController.deletar.bind(caminhaoController));

module.exports = router;
