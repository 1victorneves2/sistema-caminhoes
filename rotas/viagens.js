const express = require('express');
const router = express.Router();
const db = require('../banco/setup');

// GET - Listar todas
router.get('/', (req, res) => {
  try {
    const viagens = db.prepare(`
      SELECT 
        v.id, v.caminhao_id, v.motorista_id, v.rota, v.mercadoria, 
        v.nota_fiscal, v.status, v.data_saida, v.data_retorno,
        v.motivo_retorno, v.observacoes_retorno,
        c.placa, m.nome as motorista, f.nome as funcionario
      FROM viagens v
      LEFT JOIN caminhoes c ON v.caminhao_id = c.id
      LEFT JOIN motoristas m ON v.motorista_id = m.id
      LEFT JOIN funcionarios f ON v.funcionario_id = f.id
      ORDER BY v.id DESC
    `).all();
    res.json(viagens);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// POST - Criar nova viagem
router.post('/', (req, res) => {
  try {
    const { caminhao_id, motorista_id, funcionario_id, rota, mercadoria, nota_fiscal } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO viagens 
      (caminhao_id, motorista_id, funcionario_id, rota, mercadoria, nota_fiscal, status, data_saida)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    const result = stmt.run(
      caminhao_id, 
      motorista_id, 
      funcionario_id, 
      rota, 
      mercadoria, 
      nota_fiscal, 
      'carregado'
    );
    
    // Atualizar status do caminhão
    db.prepare('UPDATE caminhoes SET status = ? WHERE id = ?').run('carregado', caminhao_id);
    
    res.json({ id: result.lastInsertRowid, sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// PUT - Atualizar status
router.put('/:id', (req, res) => {
  try {
    const { status, motivo_retorno, observacoes_retorno } = req.body;
    const id = req.params.id;

    console.log('========================================');
    console.log('PUT VIAGEM RECEBIDO');
    console.log('ID:', id);
    console.log('Status:', status);
    console.log('Motivo:', motivo_retorno);
    console.log('========================================');

    // Verificar se viagem existe
    const viagem = db.prepare('SELECT * FROM viagens WHERE id = ?').get(id);
    
    if (!viagem) {
      console.log('ERRO: Viagem não encontrada');
      return res.status(404).json({ erro: 'Viagem não encontrada' });
    }

    console.log('Viagem encontrada:', viagem.id, viagem.rota);

    // PASSO 1: Atualizar status da viagem
    console.log('Atualizando status para:', status);
    db.prepare('UPDATE viagens SET status = ? WHERE id = ?').run(status, id);

    // PASSO 2: Se for problema, adicionar motivo e observações
    if (status === 'retorno_problema') {
      console.log('Adicionando motivo e observações');
      db.prepare('UPDATE viagens SET motivo_retorno = ?, observacoes_retorno = ? WHERE id = ?')
        .run(motivo_retorno || '', observacoes_retorno || '', id);
    }

    // PASSO 3: Atualizar caminhão de acordo
    console.log('Atualizando status do caminhão ID:', viagem.caminhao_id);
    
    if (status === 'entregue') {
      console.log('Caminhão para: DISPONÍVEL');
      db.prepare('UPDATE caminhoes SET status = ? WHERE id = ?').run('disponivel', viagem.caminhao_id);
    } 
    else if (status === 'saiu_para_entrega') {
      console.log('Caminhão para: SAIU PARA ENTREGA');
      db.prepare('UPDATE caminhoes SET status = ? WHERE id = ?').run('saiu_para_entrega', viagem.caminhao_id);
    } 
    else if (status === 'retorno_problema') {
      console.log('Caminhão para: DISPONÍVEL (retorno com problema)');
      db.prepare('UPDATE caminhoes SET status = ? WHERE id = ?').run('disponivel', viagem.caminhao_id);
    }

    console.log('SUCESSO: Viagem atualizada!');
    console.log('========================================');

    res.json({ sucesso: true, id, status, mensagem: 'Viagem atualizada com sucesso' });

  } catch (erro) {
    console.error('ERRO CRÍTICO:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar viagem: ' + erro.message });
  }
});

// DELETE - Deletar (soft delete)
router.delete('/:id', (req, res) => {
  try {
    const id = req.params.id;
    db.prepare('UPDATE viagens SET status = ? WHERE id = ?').run('cancelada', id);
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

module.exports = router;