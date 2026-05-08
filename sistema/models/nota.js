class Nota {
  static async listarPorCarregamento(carregamento_id, empresa_id) {
    const result = await global.db.query(
      `SELECT * FROM notas
       WHERE carregamento_id = $1 AND empresa_id = $2
       ORDER BY id ASC`,
      [carregamento_id, empresa_id]
    );
    return result.rows;
  }

  static async buscarPorId(id, empresa_id) {
    const result = await global.db.query(
      `SELECT * FROM notas WHERE id = $1 AND empresa_id = $2`,
      [id, empresa_id]
    );
    return result.rows[0] || null;
  }

  static async criar(carregamento_id, numero_nota, descricao, quantidade, empresa_id) {
    const result = await global.db.query(
      `INSERT INTO notas (carregamento_id, numero_nota, descricao, quantidade, empresa_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [carregamento_id, numero_nota, descricao || '', quantidade || 1, empresa_id]
    );

    await global.db.query(
      `UPDATE carregamentos SET total_notas = total_notas + 1 WHERE id = $1`,
      [carregamento_id]
    );

    return result.rows[0];
  }

  static async criarEmLote(carregamento_id, notas, empresa_id) {
    const client = await global.db.connect();
    try {
      await client.query('BEGIN');

      const resultados = [];
      for (const nota of notas) {
        const result = await client.query(
          `INSERT INTO notas (carregamento_id, numero_nota, descricao, quantidade, empresa_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [carregamento_id, nota.numero_nota, nota.descricao || '', nota.quantidade || 1, empresa_id]
        );
        resultados.push(result.rows[0]);
      }

      await client.query(
        `UPDATE carregamentos SET total_notas = total_notas + $1 WHERE id = $2`,
        [notas.length, carregamento_id]
      );

      await client.query('COMMIT');
      return resultados;
    } catch (erro) {
      await client.query('ROLLBACK');
      throw erro;
    } finally {
      client.release();
    }
  }

  static async atualizarStatus(id, status, empresa_id) {
    const result = await global.db.query(
      `UPDATE notas
       SET status = $1, data_atualizacao = NOW()
       WHERE id = $2 AND empresa_id = $3
       RETURNING *`,
      [status, id, empresa_id]
    );
    return result.rows[0] || null;
  }

  static async realocar(nota_id, carregamento_origem, carregamento_destino, motivo, empresa_id) {
    const client = await global.db.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE notas SET carregamento_id = $1, status = 'realocado', data_atualizacao = NOW()
         WHERE id = $2 AND empresa_id = $3`,
        [carregamento_destino, nota_id, empresa_id]
      );

      await client.query(
        `INSERT INTO notas_realocadas
           (nota_id, carregamento_origem, carregamento_destino, motivo, empresa_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [nota_id, carregamento_origem, carregamento_destino, motivo || '', empresa_id]
      );

      await client.query('COMMIT');
      return { sucesso: true };
    } catch (erro) {
      await client.query('ROLLBACK');
      throw erro;
    } finally {
      client.release();
    }
  }

  static async atualizarDetalhes(id, campos, empresa_id) {
    const sets = [];
    const vals = [];
    let idx = 1;

    if (campos.tipo_pagamento !== undefined) {
      sets.push(`tipo_pagamento = $${idx++}`);
      vals.push(campos.tipo_pagamento || null);
    }
    if (campos.canhoto_assinado !== undefined) {
      sets.push(`canhoto_assinado = $${idx++}`);
      vals.push(!!campos.canhoto_assinado);
      sets.push(`data_assinatura = $${idx++}`);
      vals.push(campos.canhoto_assinado ? new Date() : null);
    }
    if (campos.numero_boleto !== undefined) {
      sets.push(`numero_boleto = $${idx++}`);
      vals.push(campos.numero_boleto || null);
    }
    if (campos.data_vencimento_boleto !== undefined) {
      sets.push(`data_vencimento_boleto = $${idx++}`);
      vals.push(campos.data_vencimento_boleto || null);
    }

    if (sets.length === 0) return null;

    sets.push(`data_atualizacao = NOW()`);
    vals.push(id, empresa_id);

    const result = await global.db.query(
      `UPDATE notas SET ${sets.join(', ')}
       WHERE id = $${idx++} AND empresa_id = $${idx}
       RETURNING *`,
      vals
    );
    return result.rows[0] || null;
  }

  static async obterEstatisticas(carregamento_id, empresa_id) {
    const result = await global.db.query(
      `SELECT
         COUNT(*)                                                      AS total,
         SUM(CASE WHEN status = 'entregue'       THEN 1 ELSE 0 END)  AS entregues,
         SUM(CASE WHEN status = 'problema'       THEN 1 ELSE 0 END)  AS problema,
         SUM(CASE WHEN status = 'nao_encontrado' THEN 1 ELSE 0 END)  AS nao_encontrado,
         SUM(CASE WHEN status = 'pendente'       THEN 1 ELSE 0 END)  AS pendente,
         SUM(CASE WHEN status = 'realocado'      THEN 1 ELSE 0 END)  AS realocado
       FROM notas
       WHERE carregamento_id = $1 AND empresa_id = $2`,
      [carregamento_id, empresa_id]
    );

    const s = result.rows[0];
    const total = parseInt(s.total) || 0;
    return {
      total,
      entregues:       parseInt(s.entregues)       || 0,
      problema:        parseInt(s.problema)        || 0,
      nao_encontrado:  parseInt(s.nao_encontrado)  || 0,
      pendente:        parseInt(s.pendente)        || 0,
      realocado:       parseInt(s.realocado)       || 0,
      percentual_entregues: total > 0
        ? ((parseInt(s.entregues) / total) * 100).toFixed(2)
        : '0.00'
    };
  }
}

module.exports = Nota;
