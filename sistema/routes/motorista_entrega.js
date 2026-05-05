const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const { verificarPermissao } = require('../middlewares/verificarPermissao');
const c = require('../controllers/entregaMotoController');

const auth = [verificarToken, verificarEmpresa];

router.get('/minha-entrega',                        ...auth, verificarPermissao('entregas', 'listar_minhas'),    c.obterMinhaEntrega);
router.get('/minha-entrega/:id/notas',              ...auth, verificarPermissao('entregas', 'listar_minhas'),    c.listarMinhasNotas);
router.put('/minha-entrega/:id/chegou',             ...auth, verificarPermissao('entregas', 'atualizar_status'), c.marcarChegada);
router.put('/minha-entrega/:id/notas/:nota_id',     ...auth, verificarPermissao('entregas', 'atualizar_status'), c.atualizarStatusNota);
router.put('/minha-entrega/:id/voltando',           ...auth, verificarPermissao('entregas', 'atualizar_status'), c.marcarVoltando);

module.exports = router;
