const Nota = require('../models/nota');

const STATUS_VALIDOS = ['entregue', 'problema', 'nao_encontrado', 'pendente'];

class NotaController {
  static async listar(req, res) {
    try {
      const { carregamento_id } = req.params;
      const notas = await Nota.listarPorCarregamento(carregamento_id, req.empresa_id);
      res.json({ sucesso: true, dados: notas });
    } catch (erro) {
      console.error('Erro ao listar notas:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  static async criar(req, res) {
    try {
      const { carregamento_id } = req.params;
      const { numero_nota, descricao, quantidade } = req.body;

      if (!numero_nota) {
        return res.status(400).json({ erro: 'Número da nota é obrigatório' });
      }

      const nota = await Nota.criar(
        carregamento_id, numero_nota, descricao, quantidade || 1, req.empresa_id
      );

      res.status(201).json({
        sucesso: true,
        mensagem: 'Nota adicionada com sucesso',
        dados: nota
      });
    } catch (erro) {
      if (erro.code === '23505') {
        return res.status(409).json({ erro: 'Número de nota já existe nesta empresa' });
      }
      console.error('Erro ao criar nota:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  static async criarEmLote(req, res) {
    try {
      const { carregamento_id } = req.params;
      const { notas } = req.body;

      if (!Array.isArray(notas) || notas.length === 0) {
        return res.status(400).json({ erro: 'Array de notas obrigatório e não pode estar vazio' });
      }

      // Validar que cada item tem numero_nota
      const invalidas = notas.filter(n => !n.numero_nota);
      if (invalidas.length > 0) {
        return res.status(400).json({ erro: 'Todas as notas devem ter numero_nota' });
      }

      const notasCriadas = await Nota.criarEmLote(carregamento_id, notas, req.empresa_id);

      res.status(201).json({
        sucesso: true,
        mensagem: `${notasCriadas.length} notas adicionadas com sucesso`,
        dados: notasCriadas
      });
    } catch (erro) {
      if (erro.code === '23505') {
        return res.status(409).json({ erro: 'Uma ou mais notas já existem nesta empresa' });
      }
      console.error('Erro ao criar notas em lote:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  static async atualizarStatus(req, res) {
    try {
      const { carregamento_id, nota_id } = req.params;
      const { status, carregamento_destino, motivo } = req.body;

      if (!STATUS_VALIDOS.includes(status)) {
        return res.status(400).json({
          erro: `Status inválido. Válidos: ${STATUS_VALIDOS.join(', ')}`
        });
      }

      // Realoca para outro carregamento se informado destino
      if ((status === 'problema' || status === 'nao_encontrado') && carregamento_destino) {
        await Nota.realocar(nota_id, carregamento_id, carregamento_destino, motivo, req.empresa_id);
      } else {
        const nota = await Nota.atualizarStatus(nota_id, status, req.empresa_id);
        if (!nota) {
          return res.status(404).json({ erro: 'Nota não encontrada' });
        }
      }

      res.json({ sucesso: true, mensagem: 'Status da nota atualizado' });
    } catch (erro) {
      console.error('Erro ao atualizar status da nota:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  static async obterStats(req, res) {
    try {
      const { carregamento_id } = req.params;
      const stats = await Nota.obterEstatisticas(carregamento_id, req.empresa_id);
      res.json({ sucesso: true, dados: stats });
    } catch (erro) {
      console.error('Erro ao obter estatísticas:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }
}

module.exports = NotaController;
