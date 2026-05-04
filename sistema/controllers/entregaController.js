const { notificarAdmins } = require('../websocket');

class EntregaController {

  // GET /api/entregas/ativas
  static async listarAtivas(req, res) {
    try {
      // Tenta achar o funcionario correspondente ao usuário logado pelo nome
      const funcResult = await global.db.query(
        `SELECT id FROM funcionarios WHERE nome = $1 AND empresa_id = $2 LIMIT 1`,
        [req.user.nome, req.empresa_id]
      );

      let rows;
      if (funcResult.rows.length > 0) {
        const funcionario_id = funcResult.rows[0].id;
        // Carregamentos onde o usuário é motorista OU conferente
        const result = await global.db.query(
          `SELECT
             c.id, c.status, c.data_saida, c.empresa_id,
             cam.placa, cam.tipo,
             m.nome  AS motorista_nome,
             conf.nome AS conferente_nome,
             COUNT(DISTINCT n.id)                                           AS total_notas,
             SUM(CASE WHEN n.status = 'entregue'       THEN 1 ELSE 0 END)  AS notas_entregues,
             SUM(CASE WHEN n.status = 'problema'       THEN 1 ELSE 0 END)  AS notas_problema,
             SUM(CASE WHEN n.status = 'nao_encontrado' THEN 1 ELSE 0 END)  AS notas_nao_encontrado,
             SUM(CASE WHEN n.status = 'pendente'       THEN 1 ELSE 0 END)  AS notas_pendente
           FROM carregamentos c
           LEFT JOIN caminhoes   cam  ON cam.id  = c.caminhao_id
           LEFT JOIN funcionarios m   ON m.id   = c.motorista_id
           LEFT JOIN funcionarios conf ON conf.id = c.conferente_id
           LEFT JOIN notas n ON n.carregamento_id = c.id
           WHERE c.empresa_id = $1
             AND c.status IN ('carregado', 'em_rota', 'entregue')
             AND (c.motorista_id = $2 OR c.conferente_id = $2)
           GROUP BY c.id, cam.placa, cam.tipo, m.nome, conf.nome
           ORDER BY c.id DESC`,
          [req.empresa_id, funcionario_id]
        );
        rows = result.rows;
      } else {
        // Fallback: todos os carregamentos ativos da empresa (não admin sem funcionario cadastrado)
        const result = await global.db.query(
          `SELECT
             c.id, c.status, c.data_saida,
             cam.placa, cam.tipo,
             m.nome  AS motorista_nome,
             conf.nome AS conferente_nome,
             COUNT(DISTINCT n.id)                                           AS total_notas,
             SUM(CASE WHEN n.status = 'entregue'       THEN 1 ELSE 0 END)  AS notas_entregues,
             SUM(CASE WHEN n.status = 'problema'       THEN 1 ELSE 0 END)  AS notas_problema,
             SUM(CASE WHEN n.status = 'nao_encontrado' THEN 1 ELSE 0 END)  AS notas_nao_encontrado,
             SUM(CASE WHEN n.status = 'pendente'       THEN 1 ELSE 0 END)  AS notas_pendente
           FROM carregamentos c
           LEFT JOIN caminhoes    cam  ON cam.id  = c.caminhao_id
           LEFT JOIN funcionarios m    ON m.id   = c.motorista_id
           LEFT JOIN funcionarios conf ON conf.id = c.conferente_id
           LEFT JOIN notas n ON n.carregamento_id = c.id
           WHERE c.empresa_id = $1
             AND c.status IN ('carregado', 'em_rota', 'entregue')
           GROUP BY c.id, cam.placa, cam.tipo, m.nome, conf.nome
           ORDER BY c.id DESC`,
          [req.empresa_id]
        );
        rows = result.rows;
      }

      res.json({ sucesso: true, dados: rows });
    } catch (erro) {
      console.error('Erro ao listar entregas ativas:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  // PUT /api/entregas/:id/chegou
  static async marcarChegada(req, res) {
    try {
      const { id } = req.params;

      // Verificar que o carregamento pertence à empresa
      const check = await global.db.query(
        `SELECT id, status FROM carregamentos WHERE id = $1 AND empresa_id = $2`,
        [id, req.empresa_id]
      );
      if (check.rows.length === 0) {
        return res.status(404).json({ erro: 'Carregamento não encontrado' });
      }

      // Atualizar status para em_rota se ainda estava carregado
      if (check.rows[0].status === 'carregado') {
        await global.db.query(
          `UPDATE carregamentos SET status = 'em_rota' WHERE id = $1`,
          [id]
        );
      }

      // Notificar admins via WebSocket
      notificarAdmins('CHEGOU_LOCAL', {
        carregamento_id: parseInt(id),
        motorista: req.user.nome,
        timestamp: new Date().toISOString()
      });

      res.json({ sucesso: true, mensagem: 'Chegada registrada!' });
    } catch (erro) {
      console.error('Erro ao marcar chegada:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  // PUT /api/entregas/:id/notas/:nota_id
  static async atualizarNota(req, res) {
    try {
      const { id, nota_id } = req.params;
      const { status, motivo } = req.body;

      const STATUS_VALIDOS = ['entregue', 'problema', 'nao_encontrado', 'pendente', 'devolucao_parcial', 'sac'];
      if (!STATUS_VALIDOS.includes(status)) {
        return res.status(400).json({ erro: 'Status inválido' });
      }

      // Verificar que a nota pertence ao carregamento da empresa
      const check = await global.db.query(
        `SELECT n.id FROM notas n
         JOIN carregamentos c ON c.id = n.carregamento_id
         WHERE n.id = $1 AND n.carregamento_id = $2 AND c.empresa_id = $3`,
        [nota_id, id, req.empresa_id]
      );
      if (check.rows.length === 0) {
        return res.status(404).json({ erro: 'Nota não encontrada' });
      }

      await global.db.query(
        `UPDATE notas SET status = $1, observacoes = $2, data_atualizacao = NOW()
         WHERE id = $3`,
        [status, motivo || null, nota_id]
      );

      // Notificar admins via WebSocket
      notificarAdmins('NOTA_ATUALIZADA', {
        carregamento_id: parseInt(id),
        nota_id: parseInt(nota_id),
        status,
        motorista: req.user.nome,
        timestamp: new Date().toISOString()
      });

      res.json({ sucesso: true });
    } catch (erro) {
      console.error('Erro ao atualizar nota na entrega:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  // GET /api/entregas/:id/notas
  static async listarNotas(req, res) {
    try {
      const { id } = req.params;

      const check = await global.db.query(
        `SELECT id FROM carregamentos WHERE id = $1 AND empresa_id = $2`,
        [id, req.empresa_id]
      );
      if (check.rows.length === 0) {
        return res.status(404).json({ erro: 'Carregamento não encontrado' });
      }

      const result = await global.db.query(
        `SELECT id, numero_nota, descricao, quantidade, status, observacoes
         FROM notas
         WHERE carregamento_id = $1
         ORDER BY id ASC`,
        [id]
      );

      res.json({ sucesso: true, dados: result.rows });
    } catch (erro) {
      console.error('Erro ao listar notas para entrega:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  // POST /api/entregas/:id/finalizar
  static async finalizar(req, res) {
    try {
      const { id } = req.params;
      const { transferir_para } = req.body; // opcional: carregamento_id destino

      const checkResult = await global.db.query(
        `SELECT c.id, c.status,
           COUNT(n.id) FILTER (WHERE n.status IN ('problema','nao_encontrado','devolucao_parcial','sac')) AS pendencias,
           COUNT(n.id) FILTER (WHERE n.status = 'pendente') AS pendentes
         FROM carregamentos c
         LEFT JOIN notas n ON n.carregamento_id = c.id
         WHERE c.id = $1 AND c.empresa_id = $2
         GROUP BY c.id`,
        [id, req.empresa_id]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ erro: 'Carregamento não encontrado' });
      }

      const carg = checkResult.rows[0];
      const pendentes = parseInt(carg.pendentes) || 0;

      if (pendentes > 0) {
        return res.status(400).json({
          erro: `Há ${pendentes} nota(s) ainda pendente(s). Atualize-as antes de finalizar.`
        });
      }

      // Se deve transferir notas com problema para outro carregamento
      if (transferir_para) {
        const destCheck = await global.db.query(
          `SELECT id FROM carregamentos WHERE id = $1 AND empresa_id = $2`,
          [transferir_para, req.empresa_id]
        );
        if (destCheck.rows.length === 0) {
          return res.status(404).json({ erro: 'Carregamento destino não encontrado' });
        }

        const client = await global.db.connect();
        try {
          await client.query('BEGIN');

          // Buscar notas com pendência
          const notasProblema = await client.query(
            `SELECT numero_nota, descricao, quantidade FROM notas
             WHERE carregamento_id = $1
               AND status IN ('problema','nao_encontrado','devolucao_parcial','sac')`,
            [id]
          );

          // Inserir no destino
          for (const nota of notasProblema.rows) {
            await client.query(
              `INSERT INTO notas (carregamento_id, empresa_id, numero_nota, descricao, quantidade, status)
               VALUES ($1, $2, $3, $4, $5, 'pendente')
               ON CONFLICT (numero_nota, empresa_id) DO NOTHING`,
              [transferir_para, req.empresa_id, nota.numero_nota, nota.descricao, nota.quantidade]
            );
          }

          // Marcar notas originais como realocado
          await client.query(
            `UPDATE notas SET status = 'realocado'
             WHERE carregamento_id = $1
               AND status IN ('problema','nao_encontrado','devolucao_parcial','sac')`,
            [id]
          );

          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      }

      // Finalizar carregamento
      await global.db.query(
        `UPDATE carregamentos SET status = 'concluido', data_chegada = NOW() WHERE id = $1`,
        [id]
      );

      notificarAdmins('CARREGAMENTO_FINALIZADO', {
        carregamento_id: parseInt(id),
        motorista: req.user.nome,
        timestamp: new Date().toISOString()
      });

      res.json({ sucesso: true, mensagem: 'Carregamento finalizado com sucesso!' });
    } catch (erro) {
      console.error('Erro ao finalizar entrega:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }
}

module.exports = EntregaController;
