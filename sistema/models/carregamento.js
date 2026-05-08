class Carregamento {
  static async listar(empresa_id, limit = 20, offset = 0) {
    const result = await global.db.query(
      `SELECT c.*,
              COUNT(n.id) AS total_notas,
              SUM(CASE WHEN n.status = 'entregue' THEN 1 ELSE 0 END) AS notas_entregues
       FROM carregamentos c
       LEFT JOIN notas n ON n.carregamento_id = c.id
       WHERE c.empresa_id = $1
       GROUP BY c.id
       ORDER BY c.id DESC
       LIMIT $2 OFFSET $3`,
      [empresa_id, limit, offset]
    );
    return result.rows;
  }

  static async buscarPorId(id, empresa_id) {
    const result = await global.db.query(
      `SELECT c.*,
              COUNT(n.id) AS total_notas,
              SUM(CASE WHEN n.status = 'entregue'       THEN 1 ELSE 0 END) AS notas_entregues,
              SUM(CASE WHEN n.status = 'problema'       THEN 1 ELSE 0 END) AS notas_problema,
              SUM(CASE WHEN n.status = 'nao_encontrado' THEN 1 ELSE 0 END) AS notas_nao_encontrado,
              SUM(CASE WHEN n.status = 'pendente'       THEN 1 ELSE 0 END) AS notas_pendente
       FROM carregamentos c
       LEFT JOIN notas n ON n.carregamento_id = c.id
       WHERE c.id = $1 AND c.empresa_id = $2
       GROUP BY c.id`,
      [id, empresa_id]
    );
    return result.rows[0] || null;
  }

  static async criar(motorista_id, funcionario_id, caminhao_id, empresa_id) {
    const result = await global.db.query(
      `INSERT INTO carregamentos (motorista_id, funcionario_id, caminhao_id, status, empresa_id, data_saida)
       VALUES ($1, $2, $3, 'carregado', $4, NOW())
       RETURNING *`,
      [motorista_id, funcionario_id, caminhao_id, empresa_id]
    );
    return result.rows[0];
  }

  static async atualizarStatus(id, status, empresa_id) {
    const result = await global.db.query(
      `UPDATE carregamentos
       SET status = $1, data_atualizacao = NOW()
       WHERE id = $2 AND empresa_id = $3
       RETURNING *`,
      [status, id, empresa_id]
    );
    return result.rows[0] || null;
  }

  static async finalizar(id, empresa_id) {
    const result = await global.db.query(
      `UPDATE carregamentos
       SET status = 'concluido', data_chegada = NOW(), data_atualizacao = NOW()
       WHERE id = $1 AND empresa_id = $2
       RETURNING *`,
      [id, empresa_id]
    );
    return result.rows[0] || null;
  }
}

module.exports = Carregamento;
