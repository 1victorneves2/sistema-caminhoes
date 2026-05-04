class EstatisticasController {
  static async obterDia(req, res) {
    try {
      const dataFiltro = req.query.data || new Date().toISOString().split('T')[0];

      const result = await global.db.query(
        `SELECT
           COUNT(DISTINCT c.id)                                           AS total_carregamentos,
           COUNT(DISTINCT n.id)                                           AS total_notas,
           SUM(CASE WHEN n.status = 'entregue'       THEN 1 ELSE 0 END)  AS notas_entregues,
           SUM(CASE WHEN n.status = 'problema'       THEN 1 ELSE 0 END)  AS notas_problema,
           SUM(CASE WHEN n.status = 'nao_encontrado' THEN 1 ELSE 0 END)  AS notas_nao_encontrado,
           SUM(CASE WHEN n.status = 'pendente'       THEN 1 ELSE 0 END)  AS notas_pendente
         FROM carregamentos c
         LEFT JOIN notas n ON n.carregamento_id = c.id
         WHERE c.empresa_id = $1
           AND DATE(c.data_saida) = $2`,
        [req.empresa_id, dataFiltro]
      );

      const s = result.rows[0];
      const total = parseInt(s.total_notas) || 0;
      const entregues = parseInt(s.notas_entregues) || 0;
      const problema = parseInt(s.notas_problema) || 0;
      const nao_encontrado = parseInt(s.notas_nao_encontrado) || 0;
      const pendente = parseInt(s.notas_pendente) || 0;

      res.json({
        sucesso: true,
        dados: {
          data: dataFiltro,
          total_carregamentos: parseInt(s.total_carregamentos) || 0,
          total_notas: total,
          notas_entregues: entregues,
          notas_problema: problema,
          notas_nao_encontrado: nao_encontrado,
          notas_pendente: pendente,
          percentuais: {
            entregues:      total > 0 ? ((entregues      / total) * 100).toFixed(2) : '0.00',
            problema:       total > 0 ? ((problema       / total) * 100).toFixed(2) : '0.00',
            nao_encontrado: total > 0 ? ((nao_encontrado / total) * 100).toFixed(2) : '0.00',
            pendente:       total > 0 ? ((pendente       / total) * 100).toFixed(2) : '0.00'
          }
        }
      });
    } catch (erro) {
      console.error('Erro ao obter estatísticas do dia:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  static async obterSemana(req, res) {
    try {
      const result = await global.db.query(
        `SELECT
           DATE(c.data_saida)                                             AS data,
           COUNT(DISTINCT c.id)                                           AS total_carregamentos,
           COUNT(DISTINCT n.id)                                           AS total_notas,
           SUM(CASE WHEN n.status = 'entregue'       THEN 1 ELSE 0 END)  AS notas_entregues,
           SUM(CASE WHEN n.status = 'problema'       THEN 1 ELSE 0 END)  AS notas_problema,
           SUM(CASE WHEN n.status = 'nao_encontrado' THEN 1 ELSE 0 END)  AS notas_nao_encontrado,
           SUM(CASE WHEN n.status = 'pendente'       THEN 1 ELSE 0 END)  AS notas_pendente
         FROM carregamentos c
         LEFT JOIN notas n ON n.carregamento_id = c.id
         WHERE c.empresa_id = $1
           AND DATE(c.data_saida) >= CURRENT_DATE - INTERVAL '7 days'
         GROUP BY DATE(c.data_saida)
         ORDER BY DATE(c.data_saida) DESC`,
        [req.empresa_id]
      );

      const dados = result.rows.map(row => {
        const total = parseInt(row.total_notas) || 0;
        const entregues = parseInt(row.notas_entregues) || 0;
        return {
          data: row.data,
          total_carregamentos: parseInt(row.total_carregamentos) || 0,
          total_notas: total,
          notas_entregues: entregues,
          notas_problema: parseInt(row.notas_problema) || 0,
          notas_nao_encontrado: parseInt(row.notas_nao_encontrado) || 0,
          notas_pendente: parseInt(row.notas_pendente) || 0,
          percentual_entregues: total > 0 ? ((entregues / total) * 100).toFixed(2) : '0.00'
        };
      });

      res.json({ sucesso: true, dados });
    } catch (erro) {
      console.error('Erro ao obter estatísticas da semana:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  static async obterMes(req, res) {
    try {
      const agora = new Date();
      const mes = req.query.mes || String(agora.getMonth() + 1).padStart(2, '0');
      const ano = req.query.ano || agora.getFullYear();

      // Resumo do mês
      const resumoResult = await global.db.query(
        `SELECT
           COUNT(DISTINCT c.id)                                           AS total_carregamentos,
           COUNT(DISTINCT n.id)                                           AS total_notas,
           SUM(CASE WHEN n.status = 'entregue'       THEN 1 ELSE 0 END)  AS notas_entregues,
           SUM(CASE WHEN n.status = 'problema'       THEN 1 ELSE 0 END)  AS notas_problema,
           SUM(CASE WHEN n.status = 'nao_encontrado' THEN 1 ELSE 0 END)  AS notas_nao_encontrado,
           SUM(CASE WHEN n.status = 'pendente'       THEN 1 ELSE 0 END)  AS notas_pendente
         FROM carregamentos c
         LEFT JOIN notas n ON n.carregamento_id = c.id
         WHERE c.empresa_id = $1
           AND EXTRACT(MONTH FROM c.data_saida) = $2
           AND EXTRACT(YEAR  FROM c.data_saida) = $3`,
        [req.empresa_id, mes, ano]
      );

      // Detalhamento diário do mês
      const diariosResult = await global.db.query(
        `SELECT
           DATE(c.data_saida)                                             AS data,
           COUNT(DISTINCT c.id)                                           AS total_carregamentos,
           COUNT(DISTINCT n.id)                                           AS total_notas,
           SUM(CASE WHEN n.status = 'entregue'       THEN 1 ELSE 0 END)  AS notas_entregues,
           SUM(CASE WHEN n.status = 'problema'       THEN 1 ELSE 0 END)  AS notas_problema,
           SUM(CASE WHEN n.status = 'nao_encontrado' THEN 1 ELSE 0 END)  AS notas_nao_encontrado,
           SUM(CASE WHEN n.status = 'pendente'       THEN 1 ELSE 0 END)  AS notas_pendente
         FROM carregamentos c
         LEFT JOIN notas n ON n.carregamento_id = c.id
         WHERE c.empresa_id = $1
           AND EXTRACT(MONTH FROM c.data_saida) = $2
           AND EXTRACT(YEAR  FROM c.data_saida) = $3
         GROUP BY DATE(c.data_saida)
         ORDER BY DATE(c.data_saida) DESC`,
        [req.empresa_id, mes, ano]
      );

      const r = resumoResult.rows[0];
      const totalMes = parseInt(r.total_notas) || 0;
      const entreguesMes = parseInt(r.notas_entregues) || 0;
      const problemaMes = parseInt(r.notas_problema) || 0;
      const naoEncontradoMes = parseInt(r.notas_nao_encontrado) || 0;
      const pendenteMes = parseInt(r.notas_pendente) || 0;

      res.json({
        sucesso: true,
        dados: {
          mes: `${mes}/${ano}`,
          resumo: {
            total_carregamentos: parseInt(r.total_carregamentos) || 0,
            total_notas: totalMes,
            notas_entregues: entreguesMes,
            notas_problema: problemaMes,
            notas_nao_encontrado: naoEncontradoMes,
            notas_pendente: pendenteMes,
            percentuais: {
              entregues:      totalMes > 0 ? ((entreguesMes      / totalMes) * 100).toFixed(2) : '0.00',
              problema:       totalMes > 0 ? ((problemaMes       / totalMes) * 100).toFixed(2) : '0.00',
              nao_encontrado: totalMes > 0 ? ((naoEncontradoMes  / totalMes) * 100).toFixed(2) : '0.00',
              pendente:       totalMes > 0 ? ((pendenteMes       / totalMes) * 100).toFixed(2) : '0.00'
            }
          },
          diarios: diariosResult.rows.map(row => {
            const totalDia = parseInt(row.total_notas) || 0;
            const entreguesDia = parseInt(row.notas_entregues) || 0;
            return {
              data: row.data,
              total_carregamentos: parseInt(row.total_carregamentos) || 0,
              total_notas: totalDia,
              notas_entregues: entreguesDia,
              notas_problema: parseInt(row.notas_problema) || 0,
              notas_nao_encontrado: parseInt(row.notas_nao_encontrado) || 0,
              notas_pendente: parseInt(row.notas_pendente) || 0,
              percentual_entregues: totalDia > 0
                ? ((entreguesDia / totalDia) * 100).toFixed(2)
                : '0.00'
            };
          })
        }
      });
    } catch (erro) {
      console.error('Erro ao obter estatísticas do mês:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }
}

module.exports = EstatisticasController;
