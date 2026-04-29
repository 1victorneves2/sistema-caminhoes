const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middlewares/auth');

// ========================================
// LISTAR MOTORISTAS
// ========================================
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await global.db.query(
      'SELECT * FROM motoristas WHERE ativo = true ORDER BY id DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar motoristas:', err);
    res.status(500).json({ erro: 'Erro ao buscar motoristas' });
  }
});

// ========================================
// CRIAR MOTORISTA
// ========================================
router.post('/', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { nome, cpf, contato } = req.body;

    if (!nome || !cpf) {
      return res.status(400).json({ erro: 'Nome e CPF são obrigatórios' });
    }

    // Verificar se CPF já existe
    const existe = await global.db.query(
      'SELECT id FROM motoristas WHERE cpf = $1',
      [cpf]
    );

    if (existe.rows.length > 0) {
      return res.status(409).json({ erro: 'CPF já cadastrado' });
    }

    const result = await global.db.query(
      `INSERT INTO motoristas (nome, cpf, contato, ativo)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [nome, cpf, contato || '']
    );

    res.status(201).json({ sucesso: true, motorista: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar motorista:', err);
    res.status(500).json({ erro: 'Erro ao criar motorista' });
  }
});

// ========================================
// ATUALIZAR MOTORISTA
// ========================================
router.put('/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { nome, cpf, contato } = req.body;
    const id = req.params.id;

    if (!nome && !cpf && !contato) {
      return res.status(400).json({ erro: 'Forneça ao menos um campo para atualizar' });
    }

    // Se CPF está sendo alterado, verificar se já existe
    if (cpf) {
      const existe = await global.db.query(
        'SELECT id FROM motoristas WHERE cpf = $1 AND id != $2',
        [cpf, id]
      );
      if (existe.rows.length > 0) {
        return res.status(409).json({ erro: 'CPF já cadastrado' });
      }
    }

    const result = await global.db.query(
      `UPDATE motoristas 
       SET nome = COALESCE($1, nome),
           cpf = COALESCE($2, cpf),
           contato = COALESCE($3, contato)
       WHERE id = $4
       RETURNING *`,
      [nome || null, cpf || null, contato || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Motorista não encontrado' });
    }

    res.json({ sucesso: true, motorista: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar motorista:', err);
    res.status(500).json({ erro: 'Erro ao atualizar motorista' });
  }
});

// ========================================
// DELETAR (SOFT DELETE)
// ========================================
router.delete('/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    // Verificar se motorista tem viagens ativas
    const viagensAtivas = await global.db.query(
      `SELECT id FROM viagens 
       WHERE motorista_id = $1 AND status IN ('carregado', 'em_rota', 'saiu_para_entrega')`,
      [id]
    );

    if (viagensAtivas.rows.length > 0) {
      return res.status(409).json({
        erro: 'Não é possível deletar motorista com viagens ativas'
      });
    }

    const result = await global.db.query(
      'UPDATE motoristas SET ativo = false WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Motorista não encontrado' });
    }

    res.json({ sucesso: true, mensagem: 'Motorista deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar motorista:', err);
    res.status(500).json({ erro: 'Erro ao deletar motorista' });
  }
});

module.exports = router;