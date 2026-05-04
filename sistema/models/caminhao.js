const STATUS_VALIDOS = ['disponivel', 'carregado', 'saiu_para_entrega', 'em_rota'];

class Caminhao {
  static async listar(empresa_id) {
    const result = await global.db.query(
      'SELECT * FROM caminhoes WHERE ativo = true AND empresa_id = $1 ORDER BY id DESC',
      [empresa_id]
    );
    return result.rows;
  }

  static async buscarPorPlaca(placa, excluirId = null, empresa_id) {
    const query = excluirId
      ? 'SELECT id FROM caminhoes WHERE placa = $1 AND id != $2 AND empresa_id = $3'
      : 'SELECT id FROM caminhoes WHERE placa = $1 AND empresa_id = $2';
    const params = excluirId ? [placa, excluirId, empresa_id] : [placa, empresa_id];
    const result = await global.db.query(query, params);
    return result.rows[0] || null;
  }

  static async criar({ placa, tipo, empresa_id }) {
    const result = await global.db.query(
      `INSERT INTO caminhoes (placa, tipo, status, ativo, empresa_id)
       VALUES ($1, $2, 'disponivel', true, $3)
       RETURNING *`,
      [placa, tipo, empresa_id]
    );
    return result.rows[0] || null;
  }

  static async atualizar(id, { placa, tipo }, empresa_id) {
    const result = await global.db.query(
      `UPDATE caminhoes
       SET placa = COALESCE($1, placa),
           tipo  = COALESCE($2, tipo)
       WHERE id = $3 AND empresa_id = $4
       RETURNING *`,
      [placa || null, tipo || null, id, empresa_id]
    );
    return result.rows[0] || null;
  }

  static async atualizarStatus(id, status, empresa_id) {
    const result = await global.db.query(
      'UPDATE caminhoes SET status = $1 WHERE id = $2 AND empresa_id = $3 RETURNING *',
      [status, id, empresa_id]
    );
    return result.rows[0] || null;
  }

  static async temViagensAtivas(id) {
    const result = await global.db.query(
      `SELECT id FROM viagens
       WHERE caminhao_id = $1 AND status IN ('carregado', 'em_rota', 'saiu_para_entrega')`,
      [id]
    );
    return result.rows.length > 0;
  }

  static async deletar(id, empresa_id) {
    const result = await global.db.query(
      'UPDATE caminhoes SET ativo = false WHERE id = $1 AND empresa_id = $2 RETURNING *',
      [id, empresa_id]
    );
    return result.rows[0] || null;
  }

  static get statusValidos() {
    return STATUS_VALIDOS;
  }
}

module.exports = Caminhao;
