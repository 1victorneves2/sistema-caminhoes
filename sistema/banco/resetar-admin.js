require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function resetarAdmin() {
  try {
    const email = 'admin@sistema.com';
    const senha = 'admin123';

    const senhaHash = await bcrypt.hash(senha, 10);

    const result = await pool.query(
      `UPDATE usuarios SET senha = $1 WHERE email = $2 RETURNING id, email`,
      [senhaHash, email]
    );

    if (result.rowCount === 0) {
      console.error('❌ Nenhum usuário encontrado com o email:', email);
      process.exit(1);
    }

    console.log('✅ Senha resetada com sucesso!');
    console.log('Email:', email);
    console.log('Nova senha:', senha);

    process.exit(0);
  } catch (erro) {
    console.error('❌ Erro ao resetar senha:', erro.message);
    process.exit(1);
  }
}

resetarAdmin();
