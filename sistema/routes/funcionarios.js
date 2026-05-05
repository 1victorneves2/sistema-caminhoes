const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const { verificarPermissao } = require('../middlewares/verificarPermissao');
const funcionarioController = require('../controllers/funcionarioController');

router.get('/',       verificarToken, verificarEmpresa, verificarPermissao('funcionarios', 'listar'),  funcionarioController.listar.bind(funcionarioController));
router.post('/',      verificarToken, verificarEmpresa, verificarPermissao('funcionarios', 'criar'),   funcionarioController.criar.bind(funcionarioController));
router.put('/:id',    verificarToken, verificarEmpresa, verificarPermissao('funcionarios', 'editar'),  funcionarioController.atualizar.bind(funcionarioController));
router.delete('/:id', verificarToken, verificarEmpresa, verificarPermissao('funcionarios', 'deletar'), funcionarioController.deletar.bind(funcionarioController));

module.exports = router;
