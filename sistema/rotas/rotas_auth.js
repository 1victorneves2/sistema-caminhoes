const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { gerarToken, verificarToken } = require('../middlewares/auth');

// ========================================
// LOGIN
// ========================================
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const result = await global.db.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    }

    const usuario = result.rows[0];

    // Validar senha com bcrypt
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    }

    if (!usuario.ativo) {
      return res.status(403).json({ erro: 'Usuário desativado' });
    }

    // Gerar JWT
    const token = gerarToken(usuario);

    res.json({
      sucesso: true,
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role
      }
    });
  } catch (erro) {
    console.error('Erro ao fazer login:', erro);
    res.status(500).json({ erro: 'Erro ao fazer login' });
  }
});

// ========================================
// REGISTRAR (criar admin inicial)
// ========================================
router.post('/registrar', async (req, res) => {
  try {
    const { email, senha, nome, role } = req.body;

    if (!email || !senha || !nome) {
      return res.status(400).json({ erro: 'Email, senha e nome são obrigatórios' });
    }

    // Hash de senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Inserir usuário
    const result = await global.db.query(
      `INSERT INTO usuarios (email, senha, nome, role, ativo)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, email, nome, role`,
      [email, senhaHash, nome, role || 'user']
    );

    if (result.rows.length === 0) {
      return res.status(500).json({ erro: 'Erro ao criar usuário' });
    }

    res.json({ sucesso: true, usuario: result.rows[0] });
  } catch (erro) {
    if (erro.code === '23505') { // unique constraint violation
      return res.status(409).json({ erro: 'Email já cadastrado' });
    }
    console.error('Erro ao registrar:', erro);
    res.status(500).json({ erro: 'Erro ao criar usuário' });
  }
});

// ========================================
// VERIFICAR TOKEN
// ========================================
router.get('/verificar', verificarToken, (req, res) => {
  res.json({
    autenticado: true,
    usuario: req.user
  });
});

// ========================================
// LOGOUT
// ========================================
router.post('/logout', verificarToken, (req, res) => {
  res.json({ sucesso: true, mensagem: 'Logout realizado com sucesso' });
});

module.exports = router;