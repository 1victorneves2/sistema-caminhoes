const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const funcionarioController = require('../controllers/funcionarioController');

router.get('/',       verificarToken, verificarEmpresa,               funcionarioController.listar.bind(funcionarioController));
router.post('/',      verificarToken, verificarEmpresa, verificarAdmin, funcionarioController.criar.bind(funcionarioController));
router.put('/:id',    verificarToken, verificarEmpresa, verificarAdmin, funcionarioController.atualizar.bind(funcionarioController));
router.delete('/:id', verificarToken, verificarEmpresa, verificarAdmin, funcionarioController.deletar.bind(funcionarioController));

module.exports = router;
