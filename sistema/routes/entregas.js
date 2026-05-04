const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const EntregaController = require('../controllers/entregaController');

router.get('/ativas',                    verificarToken, verificarEmpresa, EntregaController.listarAtivas);
router.put('/:id/chegou',                verificarToken, verificarEmpresa, EntregaController.marcarChegada);
router.get('/:id/notas',                 verificarToken, verificarEmpresa, EntregaController.listarNotas);
router.put('/:id/notas/:nota_id',        verificarToken, verificarEmpresa, EntregaController.atualizarNota);
router.post('/:id/finalizar',            verificarToken, verificarEmpresa, EntregaController.finalizar);

module.exports = router;
