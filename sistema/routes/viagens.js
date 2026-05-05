const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const { verificarPermissao } = require('../middlewares/verificarPermissao');
const viagemController = require('../controllers/viagemController');

const ctrl = viagemController;
const auth = [verificarToken, verificarEmpresa];

router.get('/',                          ...auth, verificarPermissao('carregamentos', 'listar'), ctrl.listar.bind(ctrl));
router.post('/',                         ...auth, verificarPermissao('carregamentos', 'criar'),  ctrl.criar.bind(ctrl));
router.put('/:id',                       ...auth, verificarPermissao('carregamentos', 'editar'), ctrl.atualizarStatus.bind(ctrl));
router.get('/buscar/:termo',             ...auth, verificarPermissao('carregamentos', 'listar'), ctrl.buscar.bind(ctrl));
router.get('/data/:dataInicio/:dataFim', ...auth, verificarPermissao('carregamentos', 'listar'), ctrl.buscarPorData.bind(ctrl));

module.exports = router;
