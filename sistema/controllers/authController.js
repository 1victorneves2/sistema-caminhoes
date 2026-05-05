const { gerarToken } = require('../middlewares/auth');
const User = require('../models/user');

const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    const usuario = await User.findByEmail(email);
    if (!usuario) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    }

    const senhaValida = await User.comparePassword(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    }

    if (!usuario.ativo) {
      return res.status(403).json({ erro: 'Usuário desativado' });
    }

    const token = gerarToken(usuario);

    // Buscar permissões da role para cache no frontend
    let permissoes = [];
    try {
      const permResult = await global.db.query(
        `SELECT p.modulo, p.acao
         FROM permissoes p
         JOIN role_permissoes rp ON p.id = rp.permissao_id
         JOIN roles r            ON rp.role_id = r.id
         WHERE r.nome = $1 AND r.empresa_id = $2`,
        [usuario.role, usuario.empresa_id || 1]
      );
      permissoes = permResult.rows;
    } catch (_) { /* permissões opcionais, não bloqueia login */ }

    res.json({
      sucesso: true,
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        empresa_id: usuario.empresa_id
      },
      permissoes
    });
  } catch (erro) {
    console.error('Erro ao fazer login:', erro);
    res.status(500).json({ erro: 'Erro ao fazer login' });
  }
};

const registrar = async (req, res) => {
  try {
    const { email, senha, nome, role } = req.body;

    if (!email || !senha || !nome) {
      return res.status(400).json({ erro: 'Email, senha e nome são obrigatórios' });
    }

    const usuario = await User.create({ email, senha, nome, role });
    if (!usuario) {
      return res.status(500).json({ erro: 'Erro ao criar usuário' });
    }

    res.json({ sucesso: true, usuario });
  } catch (erro) {
    if (erro.code === '23505') {
      return res.status(409).json({ erro: 'Email já cadastrado' });
    }
    console.error('Erro ao registrar:', erro);
    res.status(500).json({ erro: 'Erro ao criar usuário' });
  }
};

const verificar = (req, res) => {
  res.json({ autenticado: true, usuario: req.user });
};

const logout = (req, res) => {
  res.json({ sucesso: true, mensagem: 'Logout realizado com sucesso' });
};

module.exports = { login, registrar, verificar, logout };
