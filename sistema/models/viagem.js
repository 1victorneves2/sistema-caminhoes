const STATUS_VALIDOS = ['carregado', 'saiu_para_entrega', 'em_rota', 'entregue', 'retorno_problema'];

/* Após a migração, motorista_id aponta para funcionarios.
   O COALESCE garante compatibilidade com viagens antigas (ainda em motoristas). */
const SELECT_VIAGEM = `
  SELECT
    v.*,
    c.placa,
    COALESCE(m_fun.nome, m_leg.nome) AS motorista,
    f.nome AS funcionario
  FROM viagens v
  LEFT JOIN caminhoes    c     ON v.caminhao_id   = c.id
  LEFT JOIN funcionarios m_fun ON v.motorista_id  = m_fun.id
  LEFT JOIN motoristas   m_leg ON v.motorista_id  = m_leg.id
  LEFT JOIN funcionarios f     ON v.funcionario_id = f.id
`;

class Viagem {
  static get statusValidos() { return STATUS_VALIDOS; }

  static async listar(empresa_id) {
    const result = await global.db.query(
      `${SELECT_VIAGEM} WHERE v.empresa_id = $1 ORDER BY v.id DESC`,
      [empresa_id]
    );
    return result.rows;
  }

  static async buscar(termo, empresa_id) {
    const like = `%${termo}%`;
    const result = await global.db.query(
      `${SELECT_VIAGEM}
       WHERE v.empresa_id = $2
         AND (v.id::TEXT ILIKE $1
          OR c.placa   ILIKE $1
          OR v.rota    ILIKE $1)
       ORDER BY v.id DESC`,
      [like, empresa_id]
    );
    return result.rows;
  }

  static async buscarPorData(dataInicio, dataFim, empresa_id) {
    const result = await global.db.query(
      `${SELECT_VIAGEM}
       WHERE v.empresa_id = $3
         AND DATE(v.data_saida) BETWEEN $1 AND $2
       ORDER BY v.id DESC`,
      [dataInicio, dataFim, empresa_id]
    );
    return result.rows;
  }

  static async buscarPorId(id) {
    const result = await global.db.query('SELECT * FROM viagens WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async verificarCaminhao(id, empresa_id) {
    const result = await global.db.query(
      'SELECT * FROM caminhoes WHERE id = $1 AND empresa_id = $2',
      [id, empresa_id]
    );
    return result.rows[0] || null;
  }

  static async verificarMotorista(id, empresa_id) {
    // Pós-migração: motoristas vivem em funcionarios
    let result = await global.db.query(
      'SELECT * FROM funcionarios WHERE id = $1 AND empresa_id = $2',
      [id, empresa_id]
    );
    if (result.rows[0]) return result.rows[0];
    // Fallback: compatibilidade com viagens antigas (pré-migração)
    result = await global.db.query(
      'SELECT * FROM motoristas WHERE id = $1 AND empresa_id = $2',
      [id, empresa_id]
    );
    return result.rows[0] || null;
  }

  static async verificarFuncionario(id, empresa_id) {
    const result = await global.db.query(
      'SELECT * FROM funcionarios WHERE id = $1 AND empresa_id = $2',
      [id, empresa_id]
    );
    return result.rows[0] || null;
  }

  static async criar({ caminhao_id, motorista_id, funcionario_id, rota, mercadoria, nota_fiscal, empresa_id }) {
    const result = await global.db.query(
      `INSERT INTO viagens
         (caminhao_id, motorista_id, funcionario_id, rota, mercadoria, nota_fiscal, status, data_saida, empresa_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'carregado', NOW(), $7)
       RETURNING *`,
      [caminhao_id, motorista_id, funcionario_id, rota, mercadoria, nota_fiscal, empresa_id]
    );

    await global.db.query(
      "UPDATE caminhoes SET status = 'carregado' WHERE id = $1",
      [caminhao_id]
    );

    return result.rows[0];
  }

  static async atualizarStatus(id, caminhao_id, { status, motivo_retorno, observacoes_retorno }) {
    await global.db.query('UPDATE viagens SET status = $1 WHERE id = $2', [status, id]);

    if (status === 'retorno_problema') {
      await global.db.query(
        'UPDATE viagens SET motivo_retorno = $1, observacoes_retorno = $2, data_retorno = NOW() WHERE id = $3',
        [motivo_retorno || '', observacoes_retorno || '', id]
      );
    }

    if (status === 'entregue' || status === 'retorno_problema') {
      await global.db.query(
        "UPDATE caminhoes SET status = 'disponivel' WHERE id = $1",
        [caminhao_id]
      );
    }
  }
}

module.exports = Viagem;
