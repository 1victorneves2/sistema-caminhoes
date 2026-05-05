require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrar() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE funcionarios
        ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
    `);
    console.log('✅ Coluna usuario_id adicionada em funcionarios');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_funcionario_usuario
        ON funcionarios(usuario_id)
    `);
    console.log('✅ Índice idx_funcionario_usuario criado');

    await client.query('COMMIT');
    console.log('\n========================================');
    console.log('✅ Migration concluída!');
    console.log('   funcionarios.usuario_id → usuarios.id');
    console.log('========================================\n');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migration:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

migrar();
