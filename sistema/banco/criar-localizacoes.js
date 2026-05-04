require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrar() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS localizacoes (
        id              SERIAL PRIMARY KEY,
        caminhao_id     INTEGER REFERENCES caminhoes(id) ON DELETE CASCADE,
        carregamento_id INTEGER REFERENCES carregamentos(id) ON DELETE SET NULL,
        latitude        DECIMAL(10, 8) NOT NULL,
        longitude       DECIMAL(11, 8) NOT NULL,
        velocidade      DECIMAL(6, 2),
        precisao        DECIMAL(8, 2),
        timestamp       TIMESTAMP DEFAULT NOW(),
        empresa_id      INTEGER NOT NULL REFERENCES empresas(id)
      )
    `);
    console.log('✅ Tabela localizacoes criada');

    // Índices para queries frequentes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_loc_caminhao   ON localizacoes(caminhao_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_loc_carreg     ON localizacoes(carregamento_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_loc_empresa_ts ON localizacoes(empresa_id, timestamp DESC)`);
    console.log('✅ Índices criados');

    // TTL automático: particionar por data seria ideal em produção;
    // Por ora criamos função para purgar registros > 7 dias
    await pool.query(`
      CREATE OR REPLACE FUNCTION purgar_localizacoes_antigas()
      RETURNS void LANGUAGE sql AS $$
        DELETE FROM localizacoes WHERE timestamp < NOW() - INTERVAL '7 days';
      $$
    `);
    console.log('✅ Função de purga criada (chame manualmente ou com cron)');

    console.log('\n✅ Migração GPS concluída!');
    process.exit(0);
  } catch (erro) {
    console.error('❌ Erro:', erro.message);
    process.exit(1);
  }
}

migrar();
