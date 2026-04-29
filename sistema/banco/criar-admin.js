require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function criarAdmin() {
  try {
    // Dados do admin
    const email = 'admin@example.com';
    const senha = 'admin123'; // Trocar em produção!
    const nome = 'Administrador';

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Inserir admin
    const result = await pool.query(
      `INSERT INTO usuarios (email, senha, nome, role, ativo)
       VALUES ($1, $2, $3, 'admin', true)
       RETURNING id, email, nome, role`,
      [email, senhaHash, nome]
    );

    console.log('✅ Admin criado com sucesso!');
    console.log('Email:', result.rows[0].email);
    console.log('Nome:', result.rows[0].nome);
    console.log('Role:', result.rows[0].role);
    console.log('\n⚠️ Altere a senha padrão após o primeiro login!');

    process.exit(0);
  } catch (erro) {
    if (erro.code === '23505') {
      console.error('❌ Erro: Email já existe no banco de dados');
    } else {
      console.error('❌ Erro ao criar admin:', erro.message);
    }
    process.exit(1);
  }
}

criarAdmin();
