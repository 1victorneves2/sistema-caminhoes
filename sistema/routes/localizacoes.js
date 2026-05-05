const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const { verificarPermissao } = require('../middlewares/verificarPermissao');
const LocalizacaoController = require('../controllers/localizacaoController');

const auth = [verificarToken, verificarEmpresa];
const podeLerMapa = verificarPermissao('caminhoes', 'listar');

// Rota estática ANTES das dinâmicas
router.get('/ativas',              ...auth, podeLerMapa,                                   LocalizacaoController.todasAtivas);
router.post('/',                   ...auth,                                                 LocalizacaoController.salvar);
router.get('/:caminhao_id/ultima', ...auth, podeLerMapa,                                   LocalizacaoController.ultima);
router.get('/:caminhao_id/rota',   ...auth, podeLerMapa,                                   LocalizacaoController.rota);

module.exports = router;
