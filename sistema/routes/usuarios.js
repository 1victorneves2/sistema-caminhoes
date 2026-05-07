const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { verificarEmpresa } = require('../middlewares/empresa');
const { verificarPermissao } = require('../middlewares/verificarPermissao');
const c = require('../controllers/usuarioController');
const perm = require('../controllers/permissaoController');

const guard = [verificarToken, verificarEmpresa, verificarPermissao('admin', 'gerenciar_usuarios')];

// Rotas estáticas ANTES das dinâmicas (evita conflito /:id vs /roles /permissoes)
router.get('/roles',                  ...guard, c.listarRoles);
router.get('/roles/:id/permissoes',   ...guard, c.permissoesRole);
router.put('/roles/:id/permissoes',   ...guard, c.salvarPermissoesRole);
router.get('/permissoes/todas',       ...guard, perm.listarTodasPermissoes);

// Usuários (rotas raiz)
router.get('/',    ...guard, c.listar);
router.post('/',   ...guard, c.criar);

// Permissões individuais do usuário (dinâmicas com sub-rota)
router.get(   '/:id/permissoes',              ...guard, perm.obterPermissoesDoUsuario);
router.post(  '/:id/permissoes',              ...guard, perm.adicionarPermissaoAoUsuario);
router.delete('/:id/permissoes/:permissao_id',...guard, perm.removerPermissaoDoUsuario);

// Alterar senha — qualquer usuário autenticado pode alterar a própria; admin pode alterar de qualquer um
router.put('/:id/alterar-senha', verificarToken, verificarEmpresa, c.alterarSenha);

// Criar usuário para funcionário existente (operador)
router.post('/funcionario', verificarToken, verificarEmpresa, c.criarUsuarioParaFuncionario);

// CRUD de usuário (requer admin)
router.put(   '/:id', ...guard, c.atualizar);
router.delete('/:id', ...guard, c.deletar);

module.exports = router;
