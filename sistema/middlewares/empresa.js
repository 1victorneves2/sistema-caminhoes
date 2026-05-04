// Middleware que garante que cada empresa vê só seus dados
const verificarEmpresa = (req, res, next) => {
  if (!req.user || !req.user.empresa_id) {
    return res.status(401).json({ erro: 'Usuário não autenticado' });
  }

  // Adiciona empresa_id ao objeto req para usar nos controllers
  req.empresa_id = req.user.empresa_id;
  next();
};

module.exports = { verificarEmpresa };
