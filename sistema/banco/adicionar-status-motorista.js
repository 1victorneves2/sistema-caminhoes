require('dotenv').config();
const { Pool } = require('pg');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrar() {
  const client = await db.connect();
  try {
    await client.query(`
      ALTER TABLE carregamentos
        ADD COLUMN IF NOT EXISTS status_motorista VARCHAR(50)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_carregamentos_status_motorista
        ON carregamentos(status_motorista)
    `);
    console.log('✅ Coluna status_motorista adicionada a carregamentos');
  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await db.end();
  }
}

migrar();
