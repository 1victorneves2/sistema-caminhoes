const express = require('express');
const router = express.Router();

// MIDDLEWARE: Verificar autenticação
const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }
  next();
};

// LISTAR VIAGENS
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await global.db.query(`
      SELECT 
        v.*, 
        c.placa, 
        m.nome as motorista, 
        f.nome as funcionario
      FROM viagens v
      LEFT JOIN caminhoes c ON v.caminhao_id = c.id
      LEFT JOIN motoristas m ON v.motorista_id = m.id
      LEFT JOIN funcionarios f ON v.funcionario_id = f.id
      ORDER BY v.id DESC
    `);

    res.json(result.rows);
  } catch (erro) {
    console.error('Erro ao listar viagens:', erro);
    res.status(500).json({ erro: 'Erro ao listar viagens' });
  }
});

// CRIAR VIAGEM
router.post('/', verificarToken, async (req, res) => {
  try {
    const { caminhao_id, motorista_id, funcionario_id, rota, mercadoria, nota_fiscal } = req.body;

    // Validações
    if (!caminhao_id || !motorista_id || !funcionario_id || !rota || !mercadoria || !nota_fiscal) {
      return res.status(400).json({ erro: 'Dados incompletos' });
    }

    // Verificar se caminhão existe e está disponível
    const caminhao = await global.db.query('SELECT * FROM caminhoes WHERE id = $1', [caminhao_id]);
    if (!caminhao.rows.length) {
      return res.status(404).json({ erro: 'Caminhão não encontrado' });
    }
    if (caminhao.rows[0].status !== 'disponivel') {
      return res.status(400).json({ erro: 'Caminhão não está disponível' });
    }

    // Verificar se motorista existe
    const motorista = await global.db.query('SELECT * FROM motoristas WHERE id = $1', [motorista_id]);
    if (!motorista.rows.length) {
      return res.status(404).json({ erro: 'Motorista não encontrado' });
    }

    // Verificar se funcionário existe
    const funcionario = await global.db.query('SELECT * FROM funcionarios WHERE id = $1', [funcionario_id]);
    if (!funcionario.rows.length) {
      return res.status(404).json({ erro: 'Funcionário não encontrado' });
    }

    // Criar viagem
    const result = await global.db.query(
      `INSERT INTO viagens 
      (caminhao_id, motorista_id, funcionario_id, rota, mercadoria, nota_fiscal, status, data_saida)
      VALUES ($1, $2, $3, $4, $5, $6, 'carregado', NOW())
      RETURNING *`,
      [caminhao_id, motorista_id, funcionario_id, rota, mercadoria, nota_fiscal]
    );

    // Atualizar status do caminhão
    await global.db.query(
      "UPDATE caminhoes SET status = 'carregado' WHERE id = $1",
      [caminhao_id]
    );

    res.json({ sucesso: true, viagem: result.rows[0] });
  } catch (erro) {
    console.error('Erro ao criar viagem:', erro);
    res.status(500).json({ erro: 'Erro ao criar viagem' });
  }
});

// ATUALIZAR STATUS VIAGEM
router.put('/:id', verificarToken, async (req, res) => {
  try {
    const { status, motivo_retorno, observacoes_retorno } = req.body;
    const id = req.params.id;

    // Validar status
    const statusValidos = ['carregado', 'saiu_para_entrega', 'em_rota', 'entregue', 'retorno_problema'];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ erro: 'Status inválido' });
    }

    // Buscar viagem
    const viagem = await global.db.query(
      "SELECT * FROM viagens WHERE id = $1",
      [id]
    );

    if (!viagem.rows.length) {
      return res.status(404).json({ erro: 'Viagem não encontrada' });
    }

    // Atualizar status
    await global.db.query(
      "UPDATE viagens SET status = $1 WHERE id = $2",
      [status, id]
    );

    // Se for problema, salvar detalhes
    if (status === 'retorno_problema') {
      await global.db.query(
        "UPDATE viagens SET motivo_retorno = $1, observacoes_retorno = $2 WHERE id = $3",
        [motivo_retorno || '', observacoes_retorno || '', id]
      );
    }

    // Liberar caminhão quando entregue ou com problema
    if (status === 'entregue' || status === 'retorno_problema') {
      await global.db.query(
        "UPDATE caminhoes SET status = 'disponivel' WHERE id = $1",
        [viagem.rows[0].caminhao_id]
      );

      // Salvar data de retorno
      if (status === 'retorno_problema') {
        await global.db.query(
          "UPDATE viagens SET data_retorno = NOW() WHERE id = $1",
          [id]
        );
      }
    }

    res.json({ sucesso: true, mensagem: 'Viagem atualizada com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar viagem:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar viagem' });
  }
});

// BUSCAR VIAGENS
router.get('/buscar/:termo', verificarToken, async (req, res) => {
  try {
    const termo = `%${req.params.termo}%`;
    const result = await global.db.query(`
      SELECT 
        v.*, 
        c.placa, 
        m.nome as motorista, 
        f.nome as funcionario
      FROM viagens v
      LEFT JOIN caminhoes c ON v.caminhao_id = c.id
      LEFT JOIN motoristas m ON v.motorista_id = m.id
      LEFT JOIN funcionarios f ON v.funcionario_id = f.id
      WHERE v.id::TEXT ILIKE $1 
         OR c.placa ILIKE $1 
         OR v.rota ILIKE $1
      ORDER BY v.id DESC
    `, [termo]);

    res.json(result.rows);
  } catch (erro) {
    console.error('Erro ao buscar viagens:', erro);
    res.status(500).json({ erro: 'Erro ao buscar viagens' });
  }
});

// BUSCAR POR DATA
router.get('/data/:dataInicio/:dataFim', verificarToken, async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.params;
    const result = await global.db.query(`
      SELECT 
        v.*, 
        c.placa, 
        m.nome as motorista, 
        f.nome as funcionario
      FROM viagens v
      LEFT JOIN caminhoes c ON v.caminhao_id = c.id
      LEFT JOIN motoristas m ON v.motorista_id = m.id
      LEFT JOIN funcionarios f ON v.funcionario_id = f.id
      WHERE DATE(v.data_saida) BETWEEN $1 AND $2
      ORDER BY v.id DESC
    `, [dataInicio, dataFim]);

    res.json(result.rows);
  } catch (erro) {
    console.error('Erro ao buscar viagens por data:', erro);
    res.status(500).json({ erro: 'Erro ao buscar viagens' });
  }
});

module.exports = router;