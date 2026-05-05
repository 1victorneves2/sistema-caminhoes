const { notificarAdmins } = require('../websocket');

const STATUS_NOTA_VALIDOS = ['entregue', 'problema', 'nao_encontrado', 'pendente', 'devolucao_parcial', 'sac'];

async function _funcDoUsuario(userId, empresaId) {
  const r = await global.db.query(
    `SELECT id, nome FROM funcionarios WHERE usuario_id = $1 AND empresa_id = $2 AND ativo = true LIMIT 1`,
    [userId, empresaId]
  );
  return r.rows[0] || null;
}

// GET /api/motorista/minha-entrega
async function obterMinhaEntrega(req, res) {
  try {
    const func = await _funcDoUsuario(req.user.id, req.empresa_id);
    if (!func) {
      return res.status(404).json({ erro: 'Funcionário não encontrado para este usuário' });
    }

    const r = await global.db.query(
      `SELECT
         c.id, c.status, c.status_motorista, c.data_saida,
         cam.placa, cam.tipo,
         m.nome   AS motorista_nome,
         conf.nome AS conferente_nome,
         COUNT(DISTINCT n.id)                                          AS total_notas,
         SUM(CASE WHEN n.status = 'entregue'       THEN 1 ELSE 0 END) AS notas_entregues,
         SUM(CASE WHEN n.status = 'problema'       THEN 1 ELSE 0 END) AS notas_problema,
         SUM(CASE WHEN n.status = 'nao_encontrado' THEN 1 ELSE 0 END) AS notas_nao_encontrado,
         SUM(CASE WHEN n.status = 'pendente'       THEN 1 ELSE 0 END) AS notas_pendente
       FROM carregamentos c
       LEFT JOIN caminhoes    cam  ON cam.id  = c.caminhao_id
       LEFT JOIN funcionarios m    ON m.id    = c.motorista_id
       LEFT JOIN funcionarios conf ON conf.id  = c.conferente_id
       LEFT JOIN notas n ON n.carregamento_id = c.id
       WHERE c.empresa_id = $1
         AND c.status IN ('carregado', 'em_rota')
         AND (c.motorista_id = $2 OR c.conferente_id = $2)
       GROUP BY c.id, cam.placa, cam.tipo, m.nome, conf.nome
       ORDER BY c.id DESC
       LIMIT 1`,
      [req.empresa_id, func.id]
    );

    res.json({ sucesso: true, dados: r.rows[0] || null });
  } catch (err) {
    console.error('Erro ao obter entrega:', err.message);
    res.status(500).json({ erro: 'Erro ao obter entrega' });
  }
}

// GET /api/motorista/minha-entrega/:id/notas
async function listarMinhasNotas(req, res) {
  try {
    const { id } = req.params;
    const func = await _funcDoUsuario(req.user.id, req.empresa_id);
    if (!func) {
      return res.status(404).json({ erro: 'Funcionário não encontrado para este usuário' });
    }

    const check = await global.db.query(
      `SELECT id FROM carregamentos
       WHERE id = $1 AND empresa_id = $2 AND (motorista_id = $3 OR conferente_id = $3)`,
      [id, req.empresa_id, func.id]
    );
    if (!check.rows.length) {
      return res.status(403).json({ erro: 'Carregamento não pertence a este motorista' });
    }

    const r = await global.db.query(
      `SELECT id, numero_nota, descricao, quantidade, status, observacoes
       FROM notas WHERE carregamento_id = $1 ORDER BY id ASC`,
      [id]
    );

    res.json({ sucesso: true, dados: r.rows });
  } catch (err) {
    console.error('Erro ao listar notas:', err.message);
    res.status(500).json({ erro: 'Erro ao listar notas' });
  }
}

// PUT /api/motorista/minha-entrega/:id/chegou
async function marcarChegada(req, res) {
  try {
    const { id } = req.params;
    const func = await _funcDoUsuario(req.user.id, req.empresa_id);
    if (!func) {
      return res.status(404).json({ erro: 'Funcionário não encontrado para este usuário' });
    }

    const check = await global.db.query(
      `SELECT id FROM carregamentos
       WHERE id = $1 AND empresa_id = $2 AND (motorista_id = $3 OR conferente_id = $3)`,
      [id, req.empresa_id, func.id]
    );
    if (!check.rows.length) {
      return res.status(403).json({ erro: 'Carregamento não pertence a este motorista' });
    }

    await global.db.query(
      `UPDATE carregamentos
       SET status = CASE WHEN status = 'carregado' THEN 'em_rota' ELSE status END,
           status_motorista = 'chegou_local'
       WHERE id = $1`,
      [id]
    );

    notificarAdmins('CHEGOU_LOCAL', {
      carregamento_id: parseInt(id),
      motorista: func.nome,
      timestamp: new Date().toISOString()
    });

    res.json({ sucesso: true, mensagem: 'Chegada registrada!' });
  } catch (err) {
    console.error('Erro ao marcar chegada:', err.message);
    res.status(500).json({ erro: 'Erro ao registrar chegada' });
  }
}

// PUT /api/motorista/minha-entrega/:id/notas/:nota_id
async function atualizarStatusNota(req, res) {
  try {
    const { id, nota_id } = req.params;
    const { status, motivo } = req.body;

    if (!STATUS_NOTA_VALIDOS.includes(status)) {
      return res.status(400).json({ erro: 'Status inválido' });
    }

    const func = await _funcDoUsuario(req.user.id, req.empresa_id);
    if (!func) {
      return res.status(404).json({ erro: 'Funcionário não encontrado para este usuário' });
    }

    const check = await global.db.query(
      `SELECT n.id FROM notas n
       JOIN carregamentos c ON c.id = n.carregamento_id
       WHERE n.id = $1 AND n.carregamento_id = $2 AND c.empresa_id = $3
         AND (c.motorista_id = $4 OR c.conferente_id = $4)`,
      [nota_id, id, req.empresa_id, func.id]
    );
    if (!check.rows.length) {
      return res.status(403).json({ erro: 'Nota não pertence a este motorista' });
    }

    await global.db.query(
      `UPDATE notas SET status = $1, observacoes = $2, data_atualizacao = NOW() WHERE id = $3`,
      [status, motivo || null, nota_id]
    );

    const resumo = await global.db.query(
      `SELECT SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) AS pendentes
       FROM notas WHERE carregamento_id = $1`,
      [id]
    );
    const pendentes = parseInt(resumo.rows[0]?.pendentes) || 0;
    await global.db.query(
      `UPDATE carregamentos SET status_motorista = $1 WHERE id = $2`,
      [pendentes === 0 ? 'todas_atualizadas' : 'em_entrega', id]
    );

    notificarAdmins('NOTA_ATUALIZADA', {
      carregamento_id: parseInt(id),
      nota_id: parseInt(nota_id),
      status,
      motorista: func.nome,
      timestamp: new Date().toISOString()
    });

    res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro ao atualizar nota:', err.message);
    res.status(500).json({ erro: 'Erro ao atualizar nota' });
  }
}

// PUT /api/motorista/minha-entrega/:id/voltando
async function marcarVoltando(req, res) {
  try {
    const { id } = req.params;
    const func = await _funcDoUsuario(req.user.id, req.empresa_id);
    if (!func) {
      return res.status(404).json({ erro: 'Funcionário não encontrado para este usuário' });
    }

    const check = await global.db.query(
      `SELECT id FROM carregamentos
       WHERE id = $1 AND empresa_id = $2 AND (motorista_id = $3 OR conferente_id = $3)`,
      [id, req.empresa_id, func.id]
    );
    if (!check.rows.length) {
      return res.status(403).json({ erro: 'Carregamento não pertence a este motorista' });
    }

    await global.db.query(
      `UPDATE carregamentos SET status_motorista = 'voltando' WHERE id = $1`,
      [id]
    );

    notificarAdmins('CARREGAMENTO_FINALIZADO', {
      carregamento_id: parseInt(id),
      motorista: func.nome,
      timestamp: new Date().toISOString()
    });

    res.json({ sucesso: true, mensagem: 'Retorno registrado!' });
  } catch (err) {
    console.error('Erro ao marcar retorno:', err.message);
    res.status(500).json({ erro: 'Erro ao registrar retorno' });
  }
}

module.exports = { obterMinhaEntrega, listarMinhasNotas, marcarChegada, atualizarStatusNota, marcarVoltando };
