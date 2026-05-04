const Funcionario = require('../models/funcionario');
const { salvarHistorico } = require('../utils/historico');

class FuncionarioController {
  async listar(req, res) {
    try {
      const { funcao } = req.query;
      const funcionarios = await Funcionario.listar(funcao || null, req.empresa_id);
      res.json(funcionarios);
    } catch (err) {
      console.error('Erro ao buscar funcionários:', err);
      res.status(500).json({ erro: 'Erro ao buscar funcionários' });
    }
  }

  async criar(req, res) {
    try {
      const { nome, cpf, funcao } = req.body;

      if (!nome || !cpf || !funcao) {
        return res.status(400).json({ erro: 'Nome, CPF e função são obrigatórios' });
      }

      const cpfExiste = await Funcionario.buscarPorCpf(cpf, null, req.empresa_id);
      if (cpfExiste) {
        return res.status(409).json({ erro: 'CPF já cadastrado' });
      }

      const funcionario = await Funcionario.criar({ nome, cpf, funcao, empresa_id: req.empresa_id });
      await salvarHistorico(req.user.id, 'criar', 'funcionarios', funcionario.id, null, funcionario);
      res.status(201).json({ sucesso: true, funcionario });
    } catch (err) {
      console.error('Erro ao criar funcionário:', err);
      res.status(500).json({ erro: 'Erro ao criar funcionário' });
    }
  }

  async atualizar(req, res) {
    try {
      const { nome, cpf, funcao } = req.body;
      const { id } = req.params;

      if (!nome && !cpf && !funcao) {
        return res.status(400).json({ erro: 'Forneça ao menos um campo para atualizar' });
      }

      if (cpf) {
        const cpfExiste = await Funcionario.buscarPorCpf(cpf, id, req.empresa_id);
        if (cpfExiste) {
          return res.status(409).json({ erro: 'CPF já cadastrado' });
        }
      }

      const antigo = await global.db.query(
        'SELECT * FROM funcionarios WHERE id = $1 AND empresa_id = $2',
        [id, req.empresa_id]
      );
      const funcionario = await Funcionario.atualizar(id, { nome, cpf, funcao }, req.empresa_id);
      if (!funcionario) {
        return res.status(404).json({ erro: 'Funcionário não encontrado' });
      }

      await salvarHistorico(req.user.id, 'atualizar', 'funcionarios', id, antigo.rows[0] || null, funcionario);
      res.json({ sucesso: true, funcionario });
    } catch (err) {
      console.error('Erro ao atualizar funcionário:', err);
      res.status(500).json({ erro: 'Erro ao atualizar funcionário' });
    }
  }

  async deletar(req, res) {
    try {
      const { id } = req.params;

      const temAtivas = await Funcionario.temViagensAtivas(id);
      if (temAtivas) {
        return res.status(409).json({
          erro: 'Não é possível deletar funcionário com viagens ativas'
        });
      }

      const antigo = await global.db.query(
        'SELECT * FROM funcionarios WHERE id = $1 AND empresa_id = $2',
        [id, req.empresa_id]
      );
      const funcionario = await Funcionario.deletar(id, req.empresa_id);
      if (!funcionario) {
        return res.status(404).json({ erro: 'Funcionário não encontrado' });
      }

      await salvarHistorico(req.user.id, 'deletar', 'funcionarios', id, antigo.rows[0] || null, null);
      res.json({ sucesso: true, mensagem: 'Funcionário deletado com sucesso' });
    } catch (err) {
      console.error('Erro ao deletar funcionário:', err);
      res.status(500).json({ erro: 'Erro ao deletar funcionário' });
    }
  }
}

module.exports = new FuncionarioController();
