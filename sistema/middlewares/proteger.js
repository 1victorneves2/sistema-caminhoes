const jwt = require('jsonwebtoken');

const verificarAutenticacao = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Não autenticado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.empresa_id = decoded.empresa_id;
    next();
  } catch (erro) {
    if (erro.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Sessão expirada', expirado: true });
    }
    return res.status(401).json({ erro: 'Token inválido' });
  }
};

module.exports = { verificarAutenticacao };
