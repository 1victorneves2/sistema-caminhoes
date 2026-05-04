const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error('ERRO CRÍTICO: JWT_SECRET não definido nas variáveis de ambiente');
  process.exit(1);
}

// Middleware de autenticação
const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (erro) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
};

// Middleware para verificar se é admin
const verificarAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ erro: 'Acesso apenas para administradores' });
  }
  next();
};

// Gerar token
const gerarToken = (usuario) => {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      role: usuario.role,
      empresa_id: usuario.empresa_id
    },
    SECRET,
    { expiresIn: '1h' }
  );
};

module.exports = {
  verificarToken,
  verificarAdmin,
  gerarToken
};
