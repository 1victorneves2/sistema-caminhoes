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
    const { nome, cpf, funcao, observacoes } = req.body;
    const empresa_id = req.empresa_id;

    if (!nome || !cpf || !funcao) {
      return res.status(400).json({ erro: 'Nome, CPF e Função são obrigatórios' });
    }

    try {
      const resultado = await global.db.query(
        `INSERT INTO funcionarios (nome, cpf, funcao, empresa_id, ativo)
         VALUES ($1, $2, $3, $4, true)
         RETURNING *`,
        [nome, cpf, funcao, empresa_id]
      );

      res.status(201).json({
        mensagem: 'Funcionário criado com sucesso',
        funcionario: resultado.rows[0]
      });
    } catch (erro) {
      console.error('Erro ao criar funcionário:', erro);

      if (erro.message && erro.message.includes('duplicate key') && erro.message.includes('cpf')) {
        return res.status(400).json({ erro: 'CPF já cadastrado' });
      }
      if (erro.code === '23505') {
        return res.status(409).json({ erro: 'CPF já cadastrado' });
      }

      res.status(500).json({ erro: 'Erro ao criar funcionário: ' + erro.message });
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

  async listarFuncionariosSemUsuario(req, res) {
    const empresa_id = req.empresa_id;

    try {
      const resultado = await global.db.query(
        `SELECT id, nome, cpf, funcao
         FROM funcionarios
         WHERE empresa_id = $1 AND usuario_id IS NULL AND ativo = true
         ORDER BY nome`,
        [empresa_id]
      );

      res.json({ funcionarios: resultado.rows });
    } catch (erro) {
      res.status(500).json({ erro: erro.message });
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
