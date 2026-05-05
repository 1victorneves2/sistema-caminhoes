class Funcionario {
  static async listar(funcao = null, empresa_id) {
    if (funcao) {
      const result = await global.db.query(
        'SELECT * FROM funcionarios WHERE ativo = true AND funcao = $1 AND empresa_id = $2 ORDER BY nome ASC',
        [funcao, empresa_id]
      );
      return result.rows;
    }
    const result = await global.db.query(
      'SELECT * FROM funcionarios WHERE ativo = true AND empresa_id = $1 ORDER BY funcao ASC, nome ASC',
      [empresa_id]
    );
    return result.rows;
  }

  static async buscarPorCpf(cpf, excluirId = null, empresa_id) {
    const query = excluirId
      ? 'SELECT id FROM funcionarios WHERE cpf = $1 AND id != $2 AND empresa_id = $3'
      : 'SELECT id FROM funcionarios WHERE cpf = $1 AND empresa_id = $2';
    const params = excluirId ? [cpf, excluirId, empresa_id] : [cpf, empresa_id];
    const result = await global.db.query(query, params);
    return result.rows[0] || null;
  }

  static async criar({ nome, cpf, funcao, observacoes, usuario_id, empresa_id }) {
    const result = await global.db.query(
      `INSERT INTO funcionarios (nome, cpf, funcao, observacoes, usuario_id, ativo, empresa_id)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING *`,
      [nome, cpf, funcao, observacoes || null, usuario_id || null, empresa_id]
    );
    return result.rows[0] || null;
  }

  static async atualizar(id, { nome, cpf, funcao }, empresa_id) {
    const result = await global.db.query(
      `UPDATE funcionarios
       SET nome   = COALESCE($1, nome),
           cpf    = COALESCE($2, cpf),
           funcao = COALESCE($3, funcao)
       WHERE id = $4 AND empresa_id = $5
       RETURNING *`,
      [nome || null, cpf || null, funcao || null, id, empresa_id]
    );
    return result.rows[0] || null;
  }

  static async temViagensAtivas(id) {
    const result = await global.db.query(
      `SELECT id FROM viagens
       WHERE funcionario_id = $1 AND status IN ('carregado', 'em_rota', 'saiu_para_entrega')`,
      [id]
    );
    return result.rows.length > 0;
  }

  static async deletar(id, empresa_id) {
    const result = await global.db.query(
      'UPDATE funcionarios SET ativo = false WHERE id = $1 AND empresa_id = $2 RETURNING *',
      [id, empresa_id]
    );
    return result.rows[0] || null;
  }
}

module.exports = Funcionario;
