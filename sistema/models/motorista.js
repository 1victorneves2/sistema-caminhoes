class Motorista {
  static async listar(empresa_id) {
    const result = await global.db.query(
      'SELECT * FROM motoristas WHERE ativo = true AND empresa_id = $1 ORDER BY id DESC',
      [empresa_id]
    );
    return result.rows;
  }

  static async buscarPorCpf(cpf, excluirId = null, empresa_id) {
    const query = excluirId
      ? 'SELECT id FROM motoristas WHERE cpf = $1 AND id != $2 AND empresa_id = $3'
      : 'SELECT id FROM motoristas WHERE cpf = $1 AND empresa_id = $2';
    const params = excluirId ? [cpf, excluirId, empresa_id] : [cpf, empresa_id];
    const result = await global.db.query(query, params);
    return result.rows[0] || null;
  }

  static async criar({ nome, cpf, contato, empresa_id }) {
    const result = await global.db.query(
      `INSERT INTO motoristas (nome, cpf, contato, ativo, empresa_id)
       VALUES ($1, $2, $3, true, $4)
       RETURNING *`,
      [nome, cpf, contato || '', empresa_id]
    );
    return result.rows[0] || null;
  }

  static async atualizar(id, { nome, cpf, contato }, empresa_id) {
    const result = await global.db.query(
      `UPDATE motoristas
       SET nome    = COALESCE($1, nome),
           cpf     = COALESCE($2, cpf),
           contato = COALESCE($3, contato)
       WHERE id = $4 AND empresa_id = $5
       RETURNING *`,
      [nome || null, cpf || null, contato || null, id, empresa_id]
    );
    return result.rows[0] || null;
  }

  static async temViagensAtivas(id) {
    const result = await global.db.query(
      `SELECT id FROM viagens
       WHERE motorista_id = $1 AND status IN ('carregado', 'em_rota', 'saiu_para_entrega')`,
      [id]
    );
    return result.rows.length > 0;
  }

  static async deletar(id, empresa_id) {
    const result = await global.db.query(
      'UPDATE motoristas SET ativo = false WHERE id = $1 AND empresa_id = $2 RETURNING *',
      [id, empresa_id]
    );
    return result.rows[0] || null;
  }
}

module.exports = Motorista;
