const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middlewares/auth');

// ========================================
// LISTAR CAMINHÕES
// ========================================
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await global.db.query(
      'SELECT * FROM caminhoes WHERE ativo = true ORDER BY id DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar caminhões:', err);
    res.status(500).json({ erro: 'Erro ao buscar caminhões' });
  }
});

// ========================================
// CRIAR CAMINHÃO
// ========================================
router.post('/', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { placa, tipo } = req.body;

    if (!placa || !tipo) {
      return res.status(400).json({ erro: 'Placa e tipo são obrigatórios' });
    }

    // Verificar se placa já existe
    const existe = await global.db.query(
      'SELECT id FROM caminhoes WHERE placa = $1',
      [placa]
    );

    if (existe.rows.length > 0) {
      return res.status(409).json({ erro: 'Placa já cadastrada' });
    }

    const result = await global.db.query(
      `INSERT INTO caminhoes (placa, tipo, status, ativo)
       VALUES ($1, $2, 'disponivel', true)
       RETURNING *`,
      [placa, tipo]
    );

    res.status(201).json({ sucesso: true, caminhao: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar caminhão:', err);
    res.status(500).json({ erro: 'Erro ao criar caminhão' });
  }
});

// ========================================
// ATUALIZAR DADOS
// ========================================
router.put('/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { placa, tipo } = req.body;
    const id = req.params.id;

    if (!placa && !tipo) {
      return res.status(400).json({ erro: 'Forneça ao menos um campo para atualizar' });
    }

    // Se placa está sendo alterada, verificar se já existe
    if (placa) {
      const existe = await global.db.query(
        'SELECT id FROM caminhoes WHERE placa = $1 AND id != $2',
        [placa, id]
      );
      if (existe.rows.length > 0) {
        return res.status(409).json({ erro: 'Placa já cadastrada' });
      }
    }

    const result = await global.db.query(
      `UPDATE caminhoes 
       SET placa = COALESCE($1, placa),
           tipo = COALESCE($2, tipo)
       WHERE id = $3
       RETURNING *`,
      [placa || null, tipo || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Caminhão não encontrado' });
    }

    res.json({ sucesso: true, caminhao: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar caminhão:', err);
    res.status(500).json({ erro: 'Erro ao atualizar caminhão' });
  }
});

// ========================================
// ATUALIZAR STATUS
// ========================================
router.put('/:id/status', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const id = req.params.id;

    const statusValidos = ['disponivel', 'carregado', 'saiu_para_entrega', 'em_rota'];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ erro: 'Status inválido' });
    }

    const result = await global.db.query(
      'UPDATE caminhoes SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Caminhão não encontrado' });
    }

    res.json({ sucesso: true, caminhao: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
    res.status(500).json({ erro: 'Erro ao atualizar status' });
  }
});

// ========================================
// DELETAR (SOFT DELETE)
// ========================================
router.delete('/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    // Verificar se caminhão tem viagens ativas
    const viagensAtivas = await global.db.query(
      `SELECT id FROM viagens 
       WHERE caminhao_id = $1 AND status IN ('carregado', 'em_rota', 'saiu_para_entrega')`,
      [id]
    );

    if (viagensAtivas.rows.length > 0) {
      return res.status(409).json({
        erro: 'Não é possível deletar caminhão com viagens ativas'
      });
    }

    // Soft delete
    const result = await global.db.query(
      'UPDATE caminhoes SET ativo = false WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Caminhão não encontrado' });
    }

    res.json({ sucesso: true, mensagem: 'Caminhão deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar caminhão:', err);
    res.status(500).json({ erro: 'Erro ao deletar caminhão' });
  }
});

module.exports = router;