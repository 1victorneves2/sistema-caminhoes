const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middlewares/auth');

const TABELAS_VALIDAS = ['caminhoes', 'motoristas', 'viagens', 'funcionarios', 'usuarios'];
const STATUS_VIAGEM_VALIDOS = ['carregado', 'saiu_para_entrega', 'em_rota', 'entregue', 'retorno_problema'];
const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;

function dataValida(str) {
  if (!REGEX_DATA.test(str)) return false;
  const d = new Date(str);
  return d instanceof Date && !isNaN(d);
}

// ========================================
// GET - HISTÓRICO COMPLETO
// ========================================
router.get('/historico', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { dataInicio, dataFim, tabela } = req.query;

    if ((dataInicio || dataFim) && !(dataInicio && dataFim)) {
      return res.status(400).json({ erro: 'Informe dataInicio e dataFim juntos' });
    }
    if (dataInicio && (!dataValida(dataInicio) || !dataValida(dataFim))) {
      return res.status(400).json({ erro: 'Datas devem estar no formato YYYY-MM-DD' });
    }
    if (tabela && !TABELAS_VALIDAS.includes(tabela)) {
      return res.status(400).json({ erro: `Tabela inválida. Valores aceitos: ${TABELAS_VALIDAS.join(', ')}` });
    }

    let sql = `
      SELECT
        h.id, h.acao, h.tabela, h.registro_id, h.dados_antigos, h.dados_novos, h.data_hora,
        u.nome as usuario
      FROM historico h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      WHERE 1=1
    `;
    let params = [];
    let paramCount = 1;

    if (dataInicio && dataFim) {
      sql += ` AND DATE(h.data_hora) BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(dataInicio, dataFim);
      paramCount += 2;
    }

    if (tabela) {
      sql += ` AND h.tabela = $${paramCount}`;
      params.push(tabela);
      paramCount++;
    }

    sql += ' ORDER BY h.data_hora DESC LIMIT 200';

    const result = await global.db.query(sql, params);
    res.json(result.rows);
  } catch (erro) {
    console.error('Erro ao buscar histórico:', erro);
    res.status(500).json({ erro: 'Erro ao buscar histórico' });
  }
});

// ========================================
// GET - ESTATÍSTICAS
// ========================================
router.get('/estatisticas', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const [
      caminhoes,
      motoristas,
      funcionarios,
      viagens,
      viagensEntregues,
      viagensComProblema
    ] = await Promise.all([
      global.db.query('SELECT COUNT(*) as total FROM caminhoes WHERE ativo = true'),
      global.db.query('SELECT COUNT(*) as total FROM motoristas WHERE ativo = true'),
      global.db.query('SELECT COUNT(*) as total FROM funcionarios WHERE ativo = true'),
      global.db.query('SELECT COUNT(*) as total FROM viagens'),
      global.db.query(`SELECT COUNT(*) as total FROM viagens WHERE status = 'entregue'`),
      global.db.query(`SELECT COUNT(*) as total FROM viagens WHERE status = 'retorno_problema'`)
    ]);

    res.json({
      caminhoes: parseInt(caminhoes.rows[0].total),
      motoristas: parseInt(motoristas.rows[0].total),
      funcionarios: parseInt(funcionarios.rows[0].total),
      totalViagens: parseInt(viagens.rows[0].total),
      viagensEntregues: parseInt(viagensEntregues.rows[0].total),
      viagensComProblema: parseInt(viagensComProblema.rows[0].total)
    });
  } catch (erro) {
    console.error('Erro ao buscar estatísticas:', erro);
    res.status(500).json({ erro: 'Erro ao buscar estatísticas' });
  }
});

// ========================================
// GET - RELATÓRIO DE VIAGENS
// ========================================
router.get('/relatorio/viagens', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { dataInicio, dataFim, status } = req.query;

    if ((dataInicio || dataFim) && !(dataInicio && dataFim)) {
      return res.status(400).json({ erro: 'Informe dataInicio e dataFim juntos' });
    }
    if (dataInicio && (!dataValida(dataInicio) || !dataValida(dataFim))) {
      return res.status(400).json({ erro: 'Datas devem estar no formato YYYY-MM-DD' });
    }
    if (status && !STATUS_VIAGEM_VALIDOS.includes(status)) {
      return res.status(400).json({ erro: `Status inválido. Valores aceitos: ${STATUS_VIAGEM_VALIDOS.join(', ')}` });
    }

    let sql = `
      SELECT
        v.id, v.rota, v.mercadoria, v.status,
        c.placa as caminhao,
        m.nome as motorista,
        f.nome as funcionario,
        v.data_saida, v.data_retorno,
        v.motivo_retorno, v.observacoes_retorno
      FROM viagens v
      LEFT JOIN caminhoes c ON v.caminhao_id = c.id
      LEFT JOIN motoristas m ON v.motorista_id = m.id
      LEFT JOIN funcionarios f ON v.funcionario_id = f.id
      WHERE 1=1
    `;
    let params = [];
    let paramCount = 1;

    if (dataInicio && dataFim) {
      sql += ` AND DATE(v.data_saida) BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(dataInicio, dataFim);
      paramCount += 2;
    }

    if (status) {
      sql += ` AND v.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    sql += ' ORDER BY v.data_saida DESC';

    const result = await global.db.query(sql, params);
    res.json(result.rows);
  } catch (erro) {
    console.error('Erro ao buscar relatório de viagens:', erro);
    res.status(500).json({ erro: 'Erro ao buscar relatório' });
  }
});

// ========================================
// GET - RELATÓRIO DE PROBLEMAS
// ========================================
router.get('/relatorio/problemas', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const result = await global.db.query(`
      SELECT
        v.id, v.rota, v.mercadoria,
        c.placa as caminhao,
        m.nome as motorista,
        f.nome as funcionario,
        v.data_saida, v.data_retorno,
        v.motivo_retorno, v.observacoes_retorno
      FROM viagens v
      LEFT JOIN caminhoes c ON v.caminhao_id = c.id
      LEFT JOIN motoristas m ON v.motorista_id = m.id
      LEFT JOIN funcionarios f ON v.funcionario_id = f.id
      WHERE v.status = 'retorno_problema'
      ORDER BY v.data_retorno DESC
    `);

    res.json(result.rows);
  } catch (erro) {
    console.error('Erro ao buscar problemas:', erro);
    res.status(500).json({ erro: 'Erro ao buscar problemas' });
  }
});

// ========================================
// GET - RELATÓRIO DE NOTAS (entregues x retornadas)
// ========================================
router.get('/relatorio/notas', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;

    if ((dataInicio || dataFim) && !(dataInicio && dataFim)) {
      return res.status(400).json({ erro: 'Informe dataInicio e dataFim juntos' });
    }
    if (dataInicio && (!dataValida(dataInicio) || !dataValida(dataFim))) {
      return res.status(400).json({ erro: 'Datas devem estar no formato YYYY-MM-DD' });
    }

    let filtroData = '';
    let params = [];
    let paramCount = 1;

    if (dataInicio && dataFim) {
      filtroData = ` AND DATE(v.data_saida) BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(dataInicio, dataFim);
      paramCount += 2;
    }

    const [entregues, retornadas, emAndamento] = await Promise.all([
      global.db.query(
        `SELECT COUNT(*) as total FROM viagens v WHERE v.status = 'entregue'${filtroData}`,
        params
      ),
      global.db.query(
        `SELECT COUNT(*) as total FROM viagens v WHERE v.status = 'retorno_problema'${filtroData}`,
        params
      ),
      global.db.query(
        `SELECT COUNT(*) as total FROM viagens v WHERE v.status NOT IN ('entregue', 'retorno_problema')${filtroData}`,
        params
      )
    ]);

    const totalEntregues = parseInt(entregues.rows[0].total);
    const totalRetornadas = parseInt(retornadas.rows[0].total);
    const totalEmAndamento = parseInt(emAndamento.rows[0].total);
    const totalFinalizadas = totalEntregues + totalRetornadas;
    const total = totalFinalizadas + totalEmAndamento;

    const porcentagemEntregues = totalFinalizadas > 0
      ? parseFloat(((totalEntregues / totalFinalizadas) * 100).toFixed(1))
      : 0;
    const porcentagemRetornadas = totalFinalizadas > 0
      ? parseFloat(((totalRetornadas / totalFinalizadas) * 100).toFixed(1))
      : 0;

    const detalhesRetorno = await global.db.query(
      `SELECT
        v.id, v.nota_fiscal, v.rota, v.mercadoria,
        v.motivo_retorno, v.observacoes_retorno, v.conferente_retorno,
        v.data_saida, v.data_retorno,
        m.nome as motorista,
        c.placa as caminhao
       FROM viagens v
       LEFT JOIN motoristas m ON v.motorista_id = m.id
       LEFT JOIN caminhoes c ON v.caminhao_id = c.id
       WHERE v.status = 'retorno_problema'${filtroData}
       ORDER BY v.data_retorno DESC
       LIMIT 50`,
      params
    );

    res.json({
      resumo: {
        total,
        totalFinalizadas,
        totalEntregues,
        totalRetornadas,
        totalEmAndamento,
        porcentagemEntregues,
        porcentagemRetornadas
      },
      detalhesRetorno: detalhesRetorno.rows
    });
  } catch (erro) {
    console.error('Erro ao buscar relatório de notas:', erro);
    res.status(500).json({ erro: 'Erro ao buscar relatório de notas' });
  }
});

// ========================================
// GET - CAMINHÕES DISPONÍVEIS
// ========================================
router.get('/caminhoes/disponivel', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const result = await global.db.query(`
      SELECT
        id, placa, tipo, status
      FROM caminhoes
      WHERE status = 'disponivel' AND ativo = true
      ORDER BY placa
    `);

    res.json(result.rows);
  } catch (erro) {
    console.error('Erro ao buscar caminhões disponíveis:', erro);
    res.status(500).json({ erro: 'Erro ao buscar caminhões' });
  }
});

module.exports = router;
