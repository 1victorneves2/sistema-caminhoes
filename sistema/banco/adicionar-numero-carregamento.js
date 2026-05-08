require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrar() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE carregamentos
        ADD COLUMN IF NOT EXISTS numero_carregamento VARCHAR(50) DEFAULT ''
    `);

    await client.query('COMMIT');
    console.log('✓ Coluna numero_carregamento adicionada com sucesso.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro na migração:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

migrar();
