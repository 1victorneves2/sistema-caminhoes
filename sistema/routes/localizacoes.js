const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const LocalizacaoController = require('../controllers/localizacaoController');

// Rota estática ANTES das dinâmicas
router.get('/ativas',                   verificarToken, verificarEmpresa, LocalizacaoController.todasAtivas);
router.post('/',                        verificarToken, verificarEmpresa, LocalizacaoController.salvar);
router.get('/:caminhao_id/ultima',      verificarToken, verificarEmpresa, LocalizacaoController.ultima);
router.get('/:caminhao_id/rota',        verificarToken, verificarEmpresa, LocalizacaoController.rota);

module.exports = router;
