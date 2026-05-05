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
      CREATE TABLE IF NOT EXISTS usuario_permissoes (
        id           SERIAL PRIMARY KEY,
        usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        permissao_id INTEGER NOT NULL REFERENCES permissoes(id) ON DELETE CASCADE,
        empresa_id   INTEGER NOT NULL REFERENCES empresas(id),
        criado_em    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(usuario_id, permissao_id)
      )
    `);
    console.log('✅ Tabela usuario_permissoes criada');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_usuario_permissoes
        ON usuario_permissoes(usuario_id, empresa_id)
    `);
    console.log('✅ Índice idx_usuario_permissoes criado');

    await client.query('COMMIT');

    const { rows } = await pool.query(
      `SELECT COUNT(*) AS total FROM usuario_permissoes`
    );
    console.log('\n========================================');
    console.log('✅ Migration concluída!');
    console.log(`   Permissões individuais existentes: ${rows[0].total}`);
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
