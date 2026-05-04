const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const motoristaController = require('../controllers/motoristaController');

router.get('/',       verificarToken, verificarEmpresa,               motoristaController.listar.bind(motoristaController));
router.post('/',      verificarToken, verificarEmpresa, verificarAdmin, motoristaController.criar.bind(motoristaController));
router.put('/:id',    verificarToken, verificarEmpresa, verificarAdmin, motoristaController.atualizar.bind(motoristaController));
router.delete('/:id', verificarToken, verificarEmpresa, verificarAdmin, motoristaController.deletar.bind(motoristaController));

module.exports = router;
