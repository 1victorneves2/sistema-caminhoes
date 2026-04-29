const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middlewares/auth');

// ========================================
// LISTAR FUNCIONÁRIOS
// ========================================
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await global.db.query(
      'SELECT * FROM funcionarios WHERE ativo = true ORDER BY id DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar funcionários:', err);
    res.status(500).json({ erro: 'Erro ao buscar funcionários' });
  }
});

// ========================================
// CRIAR FUNCIONÁRIO
// ========================================
router.post('/', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { nome, cpf, funcao } = req.body;

    if (!nome || !cpf || !funcao) {
      return res.status(400).json({ erro: 'Nome, CPF e função são obrigatórios' });
    }

    // Verificar se CPF já existe
    const existe = await global.db.query(
      'SELECT id FROM funcionarios WHERE cpf = $1',
      [cpf]
    );

    if (existe.rows.length > 0) {
      return res.status(409).json({ erro: 'CPF já cadastrado' });
    }

    const result = await global.db.query(
      `INSERT INTO funcionarios (nome, cpf, funcao, ativo)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [nome, cpf, funcao]
    );

    res.status(201).json({ sucesso: true, funcionario: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar funcionário:', err);
    res.status(500).json({ erro: 'Erro ao criar funcionário' });
  }
});

// ========================================
// ATUALIZAR FUNCIONÁRIO
// ========================================
router.put('/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { nome, cpf, funcao } = req.body;
    const id = req.params.id;

    if (!nome && !cpf && !funcao) {
      return res.status(400).json({ erro: 'Forneça ao menos um campo para atualizar' });
    }

    // Se CPF está sendo alterado, verificar se já existe
    if (cpf) {
      const existe = await global.db.query(
        'SELECT id FROM funcionarios WHERE cpf = $1 AND id != $2',
        [cpf, id]
      );
      if (existe.rows.length > 0) {
        return res.status(409).json({ erro: 'CPF já cadastrado' });
      }
    }

    const result = await global.db.query(
      `UPDATE funcionarios 
       SET nome = COALESCE($1, nome),
           cpf = COALESCE($2, cpf),
           funcao = COALESCE($3, funcao)
       WHERE id = $4
       RETURNING *`,
      [nome || null, cpf || null, funcao || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Funcionário não encontrado' });
    }

    res.json({ sucesso: true, funcionario: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar funcionário:', err);
    res.status(500).json({ erro: 'Erro ao atualizar funcionário' });
  }
});

// ========================================
// DELETAR (SOFT DELETE)
// ========================================
router.delete('/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    // Verificar se funcionário tem viagens ativas
    const viagensAtivas = await global.db.query(
      `SELECT id FROM viagens 
       WHERE funcionario_id = $1 AND status IN ('carregado', 'em_rota', 'saiu_para_entrega')`,
      [id]
    );

    if (viagensAtivas.rows.length > 0) {
      return res.status(409).json({
        erro: 'Não é possível deletar funcionário com viagens ativas'
      });
    }

    const result = await global.db.query(
      'UPDATE funcionarios SET ativo = false WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Funcionário não encontrado' });
    }

    res.json({ sucesso: true, mensagem: 'Funcionário deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar funcionário:', err);
    res.status(500).json({ erro: 'Erro ao deletar funcionário' });
  }
});

module.exports = router;