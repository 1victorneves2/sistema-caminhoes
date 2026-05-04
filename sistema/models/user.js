const bcrypt = require('bcryptjs');

const User = {
  async findByEmail(email) {
    const result = await global.db.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  async create({ email, senha, nome, role = 'user' }) {
    const senhaHash = await bcrypt.hash(senha, 10);
    const result = await global.db.query(
      `INSERT INTO usuarios (email, senha, nome, role, ativo)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, email, nome, role`,
      [email, senhaHash, nome, role]
    );
    return result.rows[0] || null;
  },

  async comparePassword(senha, hash) {
    return bcrypt.compare(senha, hash);
  }
};

module.exports = User;
