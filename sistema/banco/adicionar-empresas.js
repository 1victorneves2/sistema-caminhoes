require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function adicionarEmpresas() {
  try {
    // 1. Criar tabela empresas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS empresas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL UNIQUE,
        dominio VARCHAR(255) UNIQUE,
        ativa BOOLEAN DEFAULT true,
        data_criacao TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela empresas criada');

    // 2. Inserir empresa padrão
    await pool.query(`
      INSERT INTO empresas (nome, dominio, ativa)
      VALUES ('Empresa Padrão', 'localhost:3000', true)
      ON CONFLICT (nome) DO NOTHING
    `);
    console.log('✅ Empresa padrão inserida');

    // 3. Adicionar coluna empresa_id em caminhoes
    await pool.query(`
      ALTER TABLE caminhoes
      ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1 REFERENCES empresas(id)
    `);
    console.log('✅ Coluna empresa_id adicionada em caminhoes');

    // 4. Adicionar empresa_id em motoristas
    await pool.query(`
      ALTER TABLE motoristas
      ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1 REFERENCES empresas(id)
    `);
    console.log('✅ Coluna empresa_id adicionada em motoristas');

    // 5. Adicionar empresa_id em funcionarios
    await pool.query(`
      ALTER TABLE funcionarios
      ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1 REFERENCES empresas(id)
    `);
    console.log('✅ Coluna empresa_id adicionada em funcionarios');

    // 6. Adicionar empresa_id em viagens
    await pool.query(`
      ALTER TABLE viagens
      ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1 REFERENCES empresas(id)
    `);
    console.log('✅ Coluna empresa_id adicionada em viagens');

    // 7. Adicionar empresa_id em usuarios
    await pool.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1 REFERENCES empresas(id)
    `);
    console.log('✅ Coluna empresa_id adicionada em usuarios');

    console.log('\n✅ FASE 1 CONCLUÍDA!');
    console.log('   - Tabela empresas criada');
    console.log('   - Empresa padrão inserida');
    console.log('   - Todas as tabelas com empresa_id');

    process.exit(0);
  } catch (erro) {
    console.error('❌ Erro:', erro.message);
    process.exit(1);
  }
}

adicionarEmpresas();
