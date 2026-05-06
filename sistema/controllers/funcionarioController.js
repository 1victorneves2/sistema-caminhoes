const bcrypt = require('bcryptjs');
const Funcionario = require('../models/funcionario');
const { salvarHistorico } = require('../utils/historico');

// Sanitiza nome → slug de email (remove acentos, espaços → pontos)
function _emailBase(nome) {
  return nome
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '.');
}

// Gera senha aleatória legível de 8 caracteres
function _gerarSenha() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

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
      return res.status(400).json({ erro: 'Nome, CPF e função são obrigatórios' });
    }

    const cpfExiste = await Funcionario.buscarPorCpf(cpf, null, empresa_id);
    if (cpfExiste) {
      return res.status(409).json({ erro: 'CPF já cadastrado' });
    }

    // Determinar role pelo tipo de função
    const roleName = (funcao === 'Motorista' || funcao === 'Conferente') ? 'motorista' : 'operador';

    const client = await global.db.connect();
    try {
      await client.query('BEGIN');

      // Buscar role_id
      const roleResult = await client.query(
        `SELECT id, nome FROM roles WHERE nome = $1 AND empresa_id = $2 LIMIT 1`,
        [roleName, empresa_id]
      );
      if (!roleResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(500).json({ erro: `Role '${roleName}' não encontrada para esta empresa` });
      }
      const role = roleResult.rows[0];

      // Gerar email único
      const baseEmail = _emailBase(nome);
      let email = `${baseEmail}@emp${empresa_id}.local`;

      const emailExiste = await client.query(
        `SELECT id FROM usuarios WHERE email = $1 LIMIT 1`,
        [email]
      );
      if (emailExiste.rows.length) {
        // Adiciona sufixo numérico até encontrar email disponível
        const sufixo = Date.now().toString().slice(-4);
        email = `${baseEmail}${sufixo}@emp${empresa_id}.local`;
      }

      // Gerar senha temporária
      const senha = _gerarSenha();
      const senhaHash = await bcrypt.hash(senha, 10);

      // Criar usuário
      const usuarioResult = await client.query(
        `INSERT INTO usuarios (email, nome, senha, role, role_id, empresa_id, ativo)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id, email`,
        [email, nome, senhaHash, role.nome, role.id, empresa_id]
      );
      const usuario_id = usuarioResult.rows[0].id;

      // Criar funcionário vinculado
      const funcionarioResult = await client.query(
        `INSERT INTO funcionarios (nome, cpf, funcao, observacoes, usuario_id, empresa_id, ativo)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING *`,
        [nome, cpf, funcao, observacoes || null, usuario_id, empresa_id]
      );
      const funcionario = funcionarioResult.rows[0];

      await client.query('COMMIT');

      await salvarHistorico(req.user.id, 'criar', 'funcionarios', funcionario.id, null, funcionario);

      const credenciais = {
        email,
        senha,
        mensagem: 'Compartilhe essas credenciais com o funcionário. Ele poderá alterar a senha após o primeiro login.'
      };

      return res.status(201).json({
        sucesso: true,
        funcionario,
        credenciais,
        credenciais_temporarias: credenciais
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Erro ao criar funcionário:', err);
      if (err.code === '23505') {
        return res.status(409).json({ erro: 'CPF ou email já existe' });
      }
      return res.status(500).json({ erro: 'Erro ao criar funcionário' });
    } finally {
      client.release();
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
