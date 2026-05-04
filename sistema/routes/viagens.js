const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const viagemController = require('../controllers/viagemController');

const ctrl = viagemController;

router.get('/',                          verificarToken, verificarEmpresa,               ctrl.listar.bind(ctrl));
router.post('/',                         verificarToken, verificarEmpresa, verificarAdmin, ctrl.criar.bind(ctrl));
router.put('/:id',                       verificarToken, verificarEmpresa, verificarAdmin, ctrl.atualizarStatus.bind(ctrl));
router.get('/buscar/:termo',             verificarToken, verificarEmpresa, ctrl.buscar.bind(ctrl));
router.get('/data/:dataInicio/:dataFim', verificarToken, verificarEmpresa, ctrl.buscarPorData.bind(ctrl));

module.exports = router;
