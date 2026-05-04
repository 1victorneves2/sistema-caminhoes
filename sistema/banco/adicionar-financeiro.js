require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrar() {
  try {
    await pool.query(`
      ALTER TABLE carregamentos
      ADD COLUMN IF NOT EXISTS status_financeiro VARCHAR(30) DEFAULT 'pendente'
    `);
    console.log('✅ Coluna status_financeiro adicionada (carregamentos)');

    await pool.query(`
      ALTER TABLE notas
      ADD COLUMN IF NOT EXISTS observacoes TEXT
    `);
    console.log('✅ Coluna observacoes adicionada (notas) — se já existia, sem erro');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_carregamentos_status_fin
        ON carregamentos(status_financeiro)
    `);
    console.log('✅ Índice status_financeiro criado');

    console.log('\n✅ Migração financeiro concluída!');
    process.exit(0);
  } catch (erro) {
    console.error('❌ Erro:', erro.message);
    process.exit(1);
  }
}

migrar();
