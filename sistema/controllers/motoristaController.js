const Motorista = require('../models/motorista');
const { salvarHistorico } = require('../utils/historico');

class MotoristaController {
  async listar(req, res) {
    try {
      const motoristas = await Motorista.listar(req.empresa_id);
      res.json(motoristas);
    } catch (err) {
      console.error('Erro ao buscar motoristas:', err);
      res.status(500).json({ erro: 'Erro ao buscar motoristas' });
    }
  }

  async criar(req, res) {
    try {
      const { nome, cpf, contato } = req.body;

      if (!nome || !cpf) {
        return res.status(400).json({ erro: 'Nome e CPF são obrigatórios' });
      }

      const cpfExiste = await Motorista.buscarPorCpf(cpf, null, req.empresa_id);
      if (cpfExiste) {
        return res.status(409).json({ erro: 'CPF já cadastrado' });
      }

      const motorista = await Motorista.criar({ nome, cpf, contato, empresa_id: req.empresa_id });
      await salvarHistorico(req.user.id, 'criar', 'motoristas', motorista.id, null, motorista);
      res.status(201).json({ sucesso: true, motorista });
    } catch (err) {
      console.error('Erro ao criar motorista:', err);
      res.status(500).json({ erro: 'Erro ao criar motorista' });
    }
  }

  async atualizar(req, res) {
    try {
      const { nome, cpf, contato } = req.body;
      const { id } = req.params;

      if (!nome && !cpf && !contato) {
        return res.status(400).json({ erro: 'Forneça ao menos um campo para atualizar' });
      }

      if (cpf) {
        const cpfExiste = await Motorista.buscarPorCpf(cpf, id, req.empresa_id);
        if (cpfExiste) {
          return res.status(409).json({ erro: 'CPF já cadastrado' });
        }
      }

      const antigo = await global.db.query(
        'SELECT * FROM motoristas WHERE id = $1 AND empresa_id = $2',
        [id, req.empresa_id]
      );
      const motorista = await Motorista.atualizar(id, { nome, cpf, contato }, req.empresa_id);
      if (!motorista) {
        return res.status(404).json({ erro: 'Motorista não encontrado' });
      }

      await salvarHistorico(req.user.id, 'atualizar', 'motoristas', id, antigo.rows[0] || null, motorista);
      res.json({ sucesso: true, motorista });
    } catch (err) {
      console.error('Erro ao atualizar motorista:', err);
      res.status(500).json({ erro: 'Erro ao atualizar motorista' });
    }
  }

  async deletar(req, res) {
    try {
      const { id } = req.params;

      const temAtivas = await Motorista.temViagensAtivas(id);
      if (temAtivas) {
        return res.status(409).json({
          erro: 'Não é possível deletar motorista com viagens ativas'
        });
      }

      const antigo = await global.db.query(
        'SELECT * FROM motoristas WHERE id = $1 AND empresa_id = $2',
        [id, req.empresa_id]
      );
      const motorista = await Motorista.deletar(id, req.empresa_id);
      if (!motorista) {
        return res.status(404).json({ erro: 'Motorista não encontrado' });
      }

      await salvarHistorico(req.user.id, 'deletar', 'motoristas', id, antigo.rows[0] || null, null);
      res.json({ sucesso: true, mensagem: 'Motorista deletado com sucesso' });
    } catch (err) {
      console.error('Erro ao deletar motorista:', err);
      res.status(500).json({ erro: 'Erro ao deletar motorista' });
    }
  }
}

module.exports = new MotoristaController();
