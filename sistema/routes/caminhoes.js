const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const caminhaoController = require('../controllers/caminhaoController');

router.get('/',           verificarToken, verificarEmpresa,               caminhaoController.listar.bind(caminhaoController));
router.post('/',          verificarToken, verificarEmpresa, verificarAdmin, caminhaoController.criar.bind(caminhaoController));
router.put('/:id',        verificarToken, verificarEmpresa, verificarAdmin, caminhaoController.atualizar.bind(caminhaoController));
router.put('/:id/status', verificarToken, verificarEmpresa, verificarAdmin, caminhaoController.atualizarStatus.bind(caminhaoController));
router.delete('/:id',     verificarToken, verificarEmpresa, verificarAdmin, caminhaoController.deletar.bind(caminhaoController));

module.exports = router;
