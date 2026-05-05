const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const { verificarPermissao } = require('../middlewares/verificarPermissao');
const motoristaController = require('../controllers/motoristaController');

const auth = [verificarToken, verificarEmpresa];

router.get('/',       ...auth, verificarPermissao('funcionarios', 'listar'),  motoristaController.listar.bind(motoristaController));
router.post('/',      ...auth, verificarPermissao('funcionarios', 'criar'),   motoristaController.criar.bind(motoristaController));
router.put('/:id',    ...auth, verificarPermissao('funcionarios', 'editar'),  motoristaController.atualizar.bind(motoristaController));
router.delete('/:id', ...auth, verificarPermissao('funcionarios', 'deletar'), motoristaController.deletar.bind(motoristaController));

module.exports = router;
