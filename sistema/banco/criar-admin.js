require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function criarAdmin() {
  try {
    const tabelaExiste = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'usuarios'
      )
    `);

    if (!tabelaExiste.rows[0].exists) {
      console.error('❌ Tabela "usuarios" não encontrada no banco de dados.');
      process.exit(1);
    }

    const email = 'admin@sistema.com';
    const nome = 'Admin do Sistema';
    const senha = 'admin123';
    const senhaHash = await bcrypt.hash(senha, 10);

    await pool.query(
      `INSERT INTO usuarios (email, senha, nome, role, ativo)
       VALUES ($1, $2, $3, 'admin', true)
       ON CONFLICT (email) DO UPDATE SET senha = EXCLUDED.senha, nome = EXCLUDED.nome`,
      [email, senhaHash, nome]
    );

    console.log('✅ Usuário admin criado/atualizado!');
    console.log('Email:', email);
    console.log('Nome:', nome);
    console.log('Senha:', senha);

    process.exit(0);
  } catch (erro) {
    console.error('❌ Erro:', erro.message);
    process.exit(1);
  }
}

criarAdmin();
