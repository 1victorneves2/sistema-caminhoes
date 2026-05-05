// Controller de permissões individuais de usuários
// As permissões de role são gerenciadas em usuarioController.js

const db = () => global.db;

// GET /api/usuarios/permissoes/todas
// Retorna todas as permissões disponíveis no sistema (para montar checkboxes)
exports.listarTodasPermissoes = async (req, res) => {
  try {
    const resultado = await db().query(
      `SELECT id, modulo, acao, descricao
       FROM permissoes
       ORDER BY modulo, acao`
    );
    res.json({ permissoes: resultado.rows });
  } catch (err) {
    console.error('Erro ao listar permissões:', err.message);
    res.status(500).json({ erro: 'Erro ao listar permissões' });
  }
};

// GET /api/usuarios/:id/permissoes
// Retorna todas as permissões do usuário: role (tipo='role') + individuais (tipo='individual')
exports.obterPermissoesDoUsuario = async (req, res) => {
  try {
    const usuario_id = parseInt(req.params.id);
    const { empresa_id } = req.user;

    const usuarioResult = await db().query(
      `SELECT u.id, u.nome, u.email, u.role, r.id AS role_id, r.nome AS role_nome
       FROM usuarios u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1 AND u.empresa_id = $2`,
      [usuario_id, empresa_id]
    );

    if (!usuarioResult.rows.length) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    const usuario = usuarioResult.rows[0];

    const permissoesRole = await db().query(
      `SELECT p.id, p.modulo, p.acao, p.descricao, 'role' AS tipo
       FROM role_permissoes rp
       JOIN permissoes p ON rp.permissao_id = p.id
       WHERE rp.role_id = $1
       ORDER BY p.modulo, p.acao`,
      [usuario.role_id]
    );

    const permissoesIndividuais = await db().query(
      `SELECT p.id, p.modulo, p.acao, p.descricao, 'individual' AS tipo
       FROM usuario_permissoes up
       JOIN permissoes p ON up.permissao_id = p.id
       WHERE up.usuario_id = $1 AND up.empresa_id = $2
       ORDER BY p.modulo, p.acao`,
      [usuario_id, empresa_id]
    );

    // Permissões da role (indexadas por id para deduplica)
    const idsDaRole = new Set(permissoesRole.rows.map(p => p.id));

    // Individuais que não duplicam a role (adições genuínas)
    const individuaisExtras = permissoesIndividuais.rows.filter(p => !idsDaRole.has(p.id));

    res.json({
      usuario,
      permissoes: [...permissoesRole.rows, ...individuaisExtras],
      permissoes_individuais: permissoesIndividuais.rows
    });
  } catch (err) {
    console.error('Erro ao obter permissões do usuário:', err.message);
    res.status(500).json({ erro: 'Erro ao obter permissões' });
  }
};

// POST /api/usuarios/:id/permissoes
// Body: { permissao_id }
exports.adicionarPermissaoAoUsuario = async (req, res) => {
  try {
    const usuario_id = parseInt(req.params.id);
    const { empresa_id } = req.user;
    const { permissao_id } = req.body;

    if (!permissao_id) {
      return res.status(400).json({ erro: 'permissao_id é obrigatório' });
    }

    // Verificar se usuário pertence à empresa
    const uCheck = await db().query(
      `SELECT id FROM usuarios WHERE id = $1 AND empresa_id = $2`,
      [usuario_id, empresa_id]
    );
    if (!uCheck.rows.length) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    await db().query(
      `INSERT INTO usuario_permissoes (usuario_id, permissao_id, empresa_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario_id, permissao_id) DO NOTHING`,
      [usuario_id, permissao_id, empresa_id]
    );

    res.json({ mensagem: 'Permissão adicionada' });
  } catch (err) {
    console.error('Erro ao adicionar permissão:', err.message);
    res.status(500).json({ erro: err.message });
  }
};

// DELETE /api/usuarios/:id/permissoes/:permissao_id
exports.removerPermissaoDoUsuario = async (req, res) => {
  try {
    const usuario_id  = parseInt(req.params.id);
    const permissao_id = parseInt(req.params.permissao_id);
    const { empresa_id } = req.user;

    await db().query(
      `DELETE FROM usuario_permissoes
       WHERE usuario_id = $1 AND permissao_id = $2 AND empresa_id = $3`,
      [usuario_id, permissao_id, empresa_id]
    );

    res.json({ mensagem: 'Permissão removida' });
  } catch (err) {
    console.error('Erro ao remover permissão:', err.message);
    res.status(500).json({ erro: err.message });
  }
};
