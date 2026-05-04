const Caminhao = require('../models/caminhao');
const { salvarHistorico } = require('../utils/historico');

class CaminhaoController {
  async listar(req, res) {
    try {
      const caminhoes = await Caminhao.listar(req.empresa_id);
      res.json(caminhoes);
    } catch (err) {
      console.error('Erro ao buscar caminhões:', err);
      res.status(500).json({ erro: 'Erro ao buscar caminhões' });
    }
  }

  async criar(req, res) {
    try {
      const { placa, tipo } = req.body;

      if (!placa || !tipo) {
        return res.status(400).json({ erro: 'Placa e tipo são obrigatórios' });
      }

      const placaExiste = await Caminhao.buscarPorPlaca(placa, null, req.empresa_id);
      if (placaExiste) {
        return res.status(409).json({ erro: 'Placa já cadastrada' });
      }

      const caminhao = await Caminhao.criar({ placa, tipo, empresa_id: req.empresa_id });
      await salvarHistorico(req.user.id, 'criar', 'caminhoes', caminhao.id, null, caminhao);
      res.status(201).json({ sucesso: true, caminhao });
    } catch (err) {
      console.error('Erro ao criar caminhão:', err);
      res.status(500).json({ erro: 'Erro ao criar caminhão' });
    }
  }

  async atualizar(req, res) {
    try {
      const { placa, tipo } = req.body;
      const { id } = req.params;

      if (!placa && !tipo) {
        return res.status(400).json({ erro: 'Forneça ao menos um campo para atualizar' });
      }

      if (placa) {
        const placaExiste = await Caminhao.buscarPorPlaca(placa, id, req.empresa_id);
        if (placaExiste) {
          return res.status(409).json({ erro: 'Placa já cadastrada' });
        }
      }

      const antigo = await global.db.query(
        'SELECT * FROM caminhoes WHERE id = $1 AND empresa_id = $2',
        [id, req.empresa_id]
      );
      const caminhao = await Caminhao.atualizar(id, { placa, tipo }, req.empresa_id);
      if (!caminhao) {
        return res.status(404).json({ erro: 'Caminhão não encontrado' });
      }

      await salvarHistorico(req.user.id, 'atualizar', 'caminhoes', id, antigo.rows[0] || null, caminhao);
      res.json({ sucesso: true, caminhao });
    } catch (err) {
      console.error('Erro ao atualizar caminhão:', err);
      res.status(500).json({ erro: 'Erro ao atualizar caminhão' });
    }
  }

  async atualizarStatus(req, res) {
    try {
      const { status } = req.body;
      const { id } = req.params;

      if (!Caminhao.statusValidos.includes(status)) {
        return res.status(400).json({ erro: 'Status inválido' });
      }

      const antigo = await global.db.query(
        'SELECT * FROM caminhoes WHERE id = $1 AND empresa_id = $2',
        [id, req.empresa_id]
      );
      const caminhao = await Caminhao.atualizarStatus(id, status, req.empresa_id);
      if (!caminhao) {
        return res.status(404).json({ erro: 'Caminhão não encontrado' });
      }

      await salvarHistorico(req.user.id, 'atualizar_status', 'caminhoes', id, antigo.rows[0] || null, caminhao);
      res.json({ sucesso: true, caminhao });
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      res.status(500).json({ erro: 'Erro ao atualizar status' });
    }
  }

  async deletar(req, res) {
    try {
      const { id } = req.params;

      const temAtivas = await Caminhao.temViagensAtivas(id);
      if (temAtivas) {
        return res.status(409).json({
          erro: 'Não é possível deletar caminhão com viagens ativas'
        });
      }

      const antigo = await global.db.query(
        'SELECT * FROM caminhoes WHERE id = $1 AND empresa_id = $2',
        [id, req.empresa_id]
      );
      const caminhao = await Caminhao.deletar(id, req.empresa_id);
      if (!caminhao) {
        return res.status(404).json({ erro: 'Caminhão não encontrado' });
      }

      await salvarHistorico(req.user.id, 'deletar', 'caminhoes', id, antigo.rows[0] || null, null);
      res.json({ sucesso: true, mensagem: 'Caminhão deletado com sucesso' });
    } catch (err) {
      console.error('Erro ao deletar caminhão:', err);
      res.status(500).json({ erro: 'Erro ao deletar caminhão' });
    }
  }
}

module.exports = new CaminhaoController();
