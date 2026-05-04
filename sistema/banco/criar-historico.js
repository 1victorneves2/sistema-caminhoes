require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function criarTabelaHistorico() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS historico (
        id          SERIAL PRIMARY KEY,
        usuario_id  INTEGER REFERENCES usuarios(id),
        tabela      VARCHAR(50) NOT NULL,
        acao        VARCHAR(50) NOT NULL,
        registro_id INTEGER NOT NULL,
        dados_antigos JSONB,
        dados_novos   JSONB,
        data_hora   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela historico verificada/criada com sucesso');
  } finally {
    client.release();
    await pool.end();
  }
}

criarTabelaHistorico().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
