require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrar() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE notas
        ADD COLUMN IF NOT EXISTS tipo_pagamento       VARCHAR(50)  DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS canhoto_assinado     BOOLEAN      NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS data_assinatura      TIMESTAMP    DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS numero_boleto        VARCHAR(100) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS data_vencimento_boleto DATE        DEFAULT NULL
    `);

    await client.query('COMMIT');
    console.log('✓ Colunas adicionadas à tabela notas com sucesso.');
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
