require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function criarTabelas() {
  try {
    // 1. Renomear tabela viagens → carregamentos
    await pool.query(`
      ALTER TABLE IF EXISTS viagens RENAME TO carregamentos
    `);
    console.log('✅ Tabela viagens renomeada para carregamentos');

    // 2. Adicionar coluna total_notas se não existir
    await pool.query(`
      ALTER TABLE carregamentos
      ADD COLUMN IF NOT EXISTS total_notas INTEGER DEFAULT 0
    `);
    console.log('✅ Coluna total_notas adicionada');

    // 3. Adicionar coluna data_atualizacao se não existir
    await pool.query(`
      ALTER TABLE carregamentos
      ADD COLUMN IF NOT EXISTS data_atualizacao TIMESTAMP DEFAULT NOW()
    `);
    console.log('✅ Coluna data_atualizacao adicionada');

    // 4. Adicionar coluna data_chegada se não existir
    await pool.query(`
      ALTER TABLE carregamentos
      ADD COLUMN IF NOT EXISTS data_chegada TIMESTAMP
    `);
    console.log('✅ Coluna data_chegada adicionada');

    // 5. Criar tabela notas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notas (
        id SERIAL PRIMARY KEY,
        carregamento_id INTEGER NOT NULL REFERENCES carregamentos(id) ON DELETE CASCADE,
        numero_nota VARCHAR(100) NOT NULL,
        descricao VARCHAR(500),
        quantidade INTEGER DEFAULT 1,
        status VARCHAR(20) DEFAULT 'pendente',
        data_criacao TIMESTAMP DEFAULT NOW(),
        data_atualizacao TIMESTAMP DEFAULT NOW(),
        empresa_id INTEGER NOT NULL REFERENCES empresas(id),
        UNIQUE(numero_nota, empresa_id)
      )
    `);
    console.log('✅ Tabela notas criada');

    // 6. Criar tabela notas_realocadas (histórico de realocações)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notas_realocadas (
        id SERIAL PRIMARY KEY,
        nota_id INTEGER NOT NULL REFERENCES notas(id),
        carregamento_origem INTEGER NOT NULL REFERENCES carregamentos(id),
        carregamento_destino INTEGER NOT NULL REFERENCES carregamentos(id),
        motivo VARCHAR(100),
        data_realocacao TIMESTAMP DEFAULT NOW(),
        empresa_id INTEGER NOT NULL REFERENCES empresas(id)
      )
    `);
    console.log('✅ Tabela notas_realocadas criada');

    // 7. Criar índices para performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notas_carregamento ON notas(carregamento_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notas_status ON notas(status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notas_empresa ON notas(empresa_id)
    `);
    console.log('✅ Índices criados');

    console.log('\n✅ FASE 1 CONCLUÍDA!');
    console.log('   - Tabela carregamentos criada (viagens renomeada)');
    console.log('   - Tabela notas criada (até 1000+ notas por carregamento)');
    console.log('   - Tabela notas_realocadas criada (histórico)');
    console.log('   - Índices criados para performance');

    process.exit(0);
  } catch (erro) {
    console.error('❌ Erro:', erro.message);
    process.exit(1);
  }
}

criarTabelas();
