const express = require('express');
const router = express.Router();
const db = require('../banco/setup');

// ========================================
// REGISTRAR HISTÓRICO
// ========================================
function registrarHistorico(usuarioId, acao, tabela, registroId, dadosAntigos, dadosNovos) {
  try {
    const stmt = db.prepare(`
      INSERT INTO historico (usuario_id, acao, tabela, registro_id, dados_antigos, dados_novos, data_hora)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    stmt.run(
      usuarioId || 1,
      acao,
      tabela,
      registroId,
      JSON.stringify(dadosAntigos),
      JSON.stringify(dadosNovos)
    );
    
    console.log('Histórico registrado:', acao, tabela, registroId);
  } catch (erro) {
    console.error('Erro ao registrar histórico:', erro);
  }
}

// ========================================
// GET - HISTÓRICO COMPLETO
// ========================================
router.get('/historico', (req, res) => {
  try {
    const historico = db.prepare(`
      SELECT 
        h.id, h.acao, h.tabela, h.registro_id, h.dados_antigos, h.dados_novos, h.data_hora,
        u.nome as usuario
      FROM historico h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      ORDER BY h.data_hora DESC
      LIMIT 100
    `).all();
    
    res.json(historico);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// ========================================
// GET - BUSCAR HISTÓRICO POR FILTRO
// ========================================
router.get('/historico/filtrar', (req, res) => {
  try {
    const { dataInicio, dataFim, tabela } = req.query;
    
    let sql = 'SELECT h.id, h.acao, h.tabela, h.registro_id, h.dados_antigos, h.dados_novos, h.data_hora, u.nome as usuario FROM historico h LEFT JOIN usuarios u ON h.usuario_id = u.id WHERE 1=1';
    
    if (dataInicio && dataFim) {
      sql += ` AND DATE(h.data_hora) BETWEEN '${dataInicio}' AND '${dataFim}'`;
    }
    
    if (tabela) {
      sql += ` AND h.tabela = '${tabela}'`;
    }
    
    sql += ' ORDER BY h.data_hora DESC LIMIT 100';
    
    const historico = db.prepare(sql).all();
    res.json(historico);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// ========================================
// GET - USUÁRIOS
// ========================================
router.get('/usuarios', (req, res) => {
  try {
    const usuarios = db.prepare('SELECT id, nome, email, role, ativo FROM usuarios').all();
    res.json(usuarios);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// ========================================
// POST - CRIAR USUÁRIO
// ========================================
router.post('/usuarios', (req, res) => {
  try {
    const { email, senha, nome, role } = req.body;
    
    const crypto = require('crypto');
    const senhaHash = crypto.createHash('sha256').update(senha).digest('hex');
    
    const stmt = db.prepare(`
      INSERT INTO usuarios (email, senha, nome, role, ativo, data_criacao)
      VALUES (?, ?, ?, ?, 1, datetime('now'))
    `);
    
    const result = stmt.run(email, senhaHash, nome, role || 'user');
    
    // Registrar no histórico
    registrarHistorico(1, 'criar', 'usuarios', result.lastInsertRowid, {}, { email, nome, role });
    
    res.json({ id: result.lastInsertRowid, sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// ========================================
// PUT - EDITAR USUÁRIO
// ========================================
router.put('/usuarios/:id', (req, res) => {
  try {
    const { nome, role, ativo } = req.body;
    const id = req.params.id;
    
    const usuarioAntigo = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
    
    const stmt = db.prepare('UPDATE usuarios SET nome = ?, role = ?, ativo = ? WHERE id = ?');
    stmt.run(nome, role, ativo ? 1 : 0, id);
    
    // Registrar no histórico
    registrarHistorico(1, 'editar', 'usuarios', id, usuarioAntigo, { nome, role, ativo });
    
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

module.exports = { router, registrarHistorico };