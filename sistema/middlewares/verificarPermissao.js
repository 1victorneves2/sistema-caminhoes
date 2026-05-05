// Cache em memória: chave `role:empresa_id` → Set de `modulo:acao`
const _cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function _cacheKey(role, empresa_id) {
  return `${role}:${empresa_id}`;
}

async function _carregarPermissoes(role, empresa_id) {
  const resultado = await global.db.query(
    `SELECT p.modulo, p.acao
     FROM permissoes p
     JOIN role_permissoes rp ON p.id = rp.permissao_id
     JOIN roles r            ON rp.role_id = r.id
     WHERE r.nome = $1 AND r.empresa_id = $2`,
    [role, empresa_id]
  );

  const permSet = new Set(resultado.rows.map(r => `${r.modulo}:${r.acao}`));
  _cache.set(_cacheKey(role, empresa_id), {
    permissoes: permSet,
    expira: Date.now() + CACHE_TTL
  });
  return permSet;
}

async function _obterPermissoes(role, empresa_id) {
  const key = _cacheKey(role, empresa_id);
  const cached = _cache.get(key);
  if (cached && cached.expira > Date.now()) return cached.permissoes;
  return _carregarPermissoes(role, empresa_id);
}

// Limpa cache de uma role específica (chamar após alterar permissões)
function invalidarCache(role, empresa_id) {
  _cache.delete(_cacheKey(role, empresa_id));
}

// Limpa todo o cache
function limparCache() {
  _cache.clear();
}

/**
 * Middleware de verificação de permissão.
 * Uso: router.get('/', verificarPermissao('caminhoes', 'listar'), handler)
 */
function verificarPermissao(modulo, acao) {
  return async (req, res, next) => {
    try {
      const { role, empresa_id } = req.user || {};

      if (!role || !empresa_id) {
        return res.status(403).json({ erro: 'Usuário sem role ou empresa definida' });
      }

      const permissoes = await _obterPermissoes(role, empresa_id);

      if (!permissoes.has(`${modulo}:${acao}`)) {
        // Fallback: verificar permissão individual deste usuário
        const individual = await global.db.query(
          `SELECT 1 FROM usuario_permissoes up
           JOIN permissoes p ON up.permissao_id = p.id
           WHERE up.usuario_id = $1 AND up.empresa_id = $2
             AND p.modulo = $3 AND p.acao = $4
           LIMIT 1`,
          [req.user.id, empresa_id, modulo, acao]
        );

        if (!individual.rows.length) {
          return res.status(403).json({
            erro: 'Acesso negado',
            detalhe: `Permissão necessária: ${modulo}:${acao}`
          });
        }
      }

      next();
    } catch (err) {
      console.error('Erro ao verificar permissão:', err.message);
      // Falha aberta: se não conseguir consultar permissões, bloqueia
      return res.status(403).json({ erro: 'Não foi possível verificar permissões' });
    }
  };
}

/**
 * Garante que um motorista só acessa carregamentos onde é motorista ou conferente.
 * Admin e operador passam direto. Requer :id no req.params (carregamento_id).
 */
async function verificarEntregaPropria(req, res, next) {
  try {
    const { role, nome, empresa_id } = req.user || {};
    if (role !== 'motorista') return next();

    const { id } = req.params;
    if (!id) return res.status(400).json({ erro: 'ID do carregamento não informado' });

    const funcResult = await global.db.query(
      `SELECT id FROM funcionarios WHERE nome = $1 AND empresa_id = $2 LIMIT 1`,
      [nome, empresa_id]
    );
    if (!funcResult.rows.length) {
      return res.status(403).json({ erro: 'Motorista não cadastrado como funcionário' });
    }

    const funcionario_id = funcResult.rows[0].id;
    const acesso = await global.db.query(
      `SELECT id FROM carregamentos
       WHERE id = $1 AND empresa_id = $2
         AND (motorista_id = $3 OR conferente_id = $3)`,
      [id, empresa_id, funcionario_id]
    );
    if (!acesso.rows.length) {
      return res.status(403).json({ erro: 'Acesso negado: entrega não pertence a você' });
    }

    next();
  } catch (err) {
    console.error('Erro em verificarEntregaPropria:', err.message);
    return res.status(403).json({ erro: 'Não foi possível verificar acesso à entrega' });
  }
}

module.exports = { verificarPermissao, verificarEntregaPropria, invalidarCache, limparCache };
