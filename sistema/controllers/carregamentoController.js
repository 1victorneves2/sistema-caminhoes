const Carregamento = require('../models/carregamento');
const Nota = require('../models/nota');
const { notificarAdmins } = require('../websocket');

class CarregamentoController {
  static async listar(req, res) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = 20;
      const offset = (page - 1) * limit;

      const carregamentos = await Carregamento.listar(req.empresa_id, limit, offset);

      res.json({ sucesso: true, dados: carregamentos, pagina: page });
    } catch (erro) {
      console.error('Erro ao listar carregamentos:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  static async buscarDetalhes(req, res) {
    try {
      const { id } = req.params;

      const carregamento = await Carregamento.buscarPorId(id, req.empresa_id);
      if (!carregamento) {
        return res.status(404).json({ erro: 'Carregamento não encontrado' });
      }

      const notas = await Nota.listarPorCarregamento(id, req.empresa_id);
      const stats = await Nota.obterEstatisticas(id, req.empresa_id);

      res.json({ sucesso: true, carregamento, notas, stats });
    } catch (erro) {
      console.error('Erro ao buscar carregamento:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  static async criar(req, res) {
    try {
      const { motorista_id, funcionario_id, caminhao_id } = req.body;

      if (!motorista_id || !funcionario_id || !caminhao_id) {
        return res.status(400).json({ erro: 'motorista_id, funcionario_id e caminhao_id são obrigatórios' });
      }

      const carregamento = await Carregamento.criar(
        motorista_id, funcionario_id, caminhao_id, req.empresa_id
      );

      res.status(201).json({
        sucesso: true,
        mensagem: 'Carregamento criado com sucesso',
        dados: carregamento
      });
    } catch (erro) {
      console.error('Erro ao criar carregamento:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  static async finalizar(req, res) {
    try {
      const { id } = req.params;

      const carregamento = await Carregamento.finalizar(id, req.empresa_id);
      if (!carregamento) {
        return res.status(404).json({ erro: 'Carregamento não encontrado' });
      }

      res.json({
        sucesso: true,
        mensagem: 'Carregamento finalizado',
        dados: carregamento
      });
    } catch (erro) {
      console.error('Erro ao finalizar carregamento:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  // PUT /api/carregamentos/:id/transferir-problemas
  static async transferirProblemas(req, res) {
    try {
      const { id } = req.params;
      const { carregamento_destino_id, motivo } = req.body;

      if (!carregamento_destino_id) {
        return res.status(400).json({ erro: 'carregamento_destino_id é obrigatório' });
      }

      // Verificar origem
      const origem = await global.db.query(
        `SELECT id, status FROM carregamentos WHERE id = $1 AND empresa_id = $2`,
        [id, req.empresa_id]
      );
      if (origem.rows.length === 0) {
        return res.status(404).json({ erro: 'Carregamento de origem não encontrado' });
      }

      // Verificar destino
      const destino = await global.db.query(
        `SELECT id FROM carregamentos WHERE id = $1 AND empresa_id = $2`,
        [carregamento_destino_id, req.empresa_id]
      );
      if (destino.rows.length === 0) {
        return res.status(404).json({ erro: 'Carregamento de destino não encontrado' });
      }

      // Buscar notas com problema/não encontrado/pendente
      const notasResult = await global.db.query(
        `SELECT id, numero_nota, descricao, quantidade
         FROM notas
         WHERE carregamento_id = $1
           AND empresa_id = $2
           AND status IN ('problema','nao_encontrado','pendente','devolucao_parcial','sac')`,
        [id, req.empresa_id]
      );

      if (notasResult.rows.length === 0) {
        // Nenhuma nota problemática: apenas marcar como pronto_financeiro
        await global.db.query(
          `UPDATE carregamentos SET status_financeiro = 'pronto_financeiro' WHERE id = $1`,
          [id]
        );
        return res.json({ sucesso: true, transferidas: 0, mensagem: 'Nenhuma nota a transferir. Carregamento marcado como pronto para financeiro.' });
      }

      const client = await global.db.connect();
      let transferidas = 0;

      try {
        await client.query('BEGIN');

        for (const nota of notasResult.rows) {
          // Inserir cópia no destino
          const novaNotaResult = await client.query(
            `INSERT INTO notas (carregamento_id, empresa_id, numero_nota, descricao, quantidade, status)
             VALUES ($1, $2, $3, $4, $5, 'pendente')
             ON CONFLICT (numero_nota, empresa_id) DO UPDATE
               SET carregamento_id = EXCLUDED.carregamento_id,
                   status = 'pendente',
                   data_atualizacao = NOW()
             RETURNING id`,
            [carregamento_destino_id, req.empresa_id, nota.numero_nota, nota.descricao, nota.quantidade]
          );

          const novaNota = novaNotaResult.rows[0];

          // Registrar histórico de realocação
          await client.query(
            `INSERT INTO notas_realocadas
               (nota_id, carregamento_origem, carregamento_destino, motivo, empresa_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [novaNota.id, id, carregamento_destino_id, motivo || 'Transferência de problemas', req.empresa_id]
          );

          // Marcar nota original como realocada
          await client.query(
            `UPDATE notas SET status = 'realocado', data_atualizacao = NOW() WHERE id = $1`,
            [nota.id]
          );

          transferidas++;
        }

        // Marcar carregamento original como pronto para financeiro
        await client.query(
          `UPDATE carregamentos SET status_financeiro = 'pronto_financeiro' WHERE id = $1`,
          [id]
        );

        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }

      notificarAdmins('NOTAS_TRANSFERIDAS', {
        carregamento_origem: parseInt(id),
        carregamento_destino: parseInt(carregamento_destino_id),
        total_transferidas: transferidas,
        usuario: req.user.nome
      });

      res.json({
        sucesso: true,
        transferidas,
        mensagem: `${transferidas} nota(s) transferidas. Carregamento marcado como pronto para financeiro.`
      });
    } catch (erro) {
      console.error('Erro ao transferir notas:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  // PUT /api/carregamentos/:id/status-financeiro
  static async atualizarStatusFinanceiro(req, res) {
    try {
      const { id } = req.params;
      const { status_financeiro, motivo_rejeicao } = req.body;

      const STATUS_VALIDOS = ['pendente', 'pronto_financeiro', 'enviado_financeiro', 'aprovado', 'rejeitado'];
      if (!STATUS_VALIDOS.includes(status_financeiro)) {
        return res.status(400).json({ erro: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` });
      }

      const result = await global.db.query(
        `UPDATE carregamentos
         SET status_financeiro = $1
         WHERE id = $2 AND empresa_id = $3
         RETURNING id, status, status_financeiro`,
        [status_financeiro, id, req.empresa_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ erro: 'Carregamento não encontrado' });
      }

      notificarAdmins('STATUS_FINANCEIRO_ATUALIZADO', {
        carregamento_id: parseInt(id),
        status_financeiro,
        motivo_rejeicao: motivo_rejeicao || null,
        usuario: req.user.nome
      });

      res.json({ sucesso: true, dados: result.rows[0] });
    } catch (erro) {
      console.error('Erro ao atualizar status financeiro:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  // GET /api/carregamentos/financeiro  — para o painel financeiro
  static async listarFinanceiro(req, res) {
    try {
      const { status_financeiro } = req.query;

      const filtro = status_financeiro ? `AND c.status_financeiro = $2` : '';
      const params = status_financeiro ? [req.empresa_id, status_financeiro] : [req.empresa_id];

      const result = await global.db.query(
        `SELECT
           c.id, c.status, c.status_financeiro, c.data_saida, c.data_chegada,
           cam.placa,
           m.nome   AS motorista_nome,
           conf.nome AS conferente_nome,
           COUNT(DISTINCT n.id)                                           AS total_notas,
           SUM(CASE WHEN n.status = 'entregue'  THEN 1 ELSE 0 END)       AS notas_entregues,
           SUM(CASE WHEN n.status = 'realocado' THEN 1 ELSE 0 END)       AS notas_realocadas,
           SUM(CASE WHEN n.status IN ('problema','nao_encontrado') THEN 1 ELSE 0 END) AS notas_problema
         FROM carregamentos c
         LEFT JOIN caminhoes    cam  ON cam.id  = c.caminhao_id
         LEFT JOIN funcionarios m    ON m.id   = c.motorista_id
         LEFT JOIN funcionarios conf ON conf.id = c.conferente_id
         LEFT JOIN notas n ON n.carregamento_id = c.id
         WHERE c.empresa_id = $1 ${filtro}
         GROUP BY c.id, cam.placa, m.nome, conf.nome
         ORDER BY c.id DESC
         LIMIT 100`,
        params
      );

      res.json({ sucesso: true, dados: result.rows });
    } catch (erro) {
      console.error('Erro ao listar financeiro:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }
}

module.exports = CarregamentoController;
