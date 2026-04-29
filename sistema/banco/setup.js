require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupBanco() {
  try {
    // Tabela: CAMINHÕES
    await pool.query(`
      CREATE TABLE IF NOT EXISTS caminhoes (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(20) NOT NULL UNIQUE,
        tipo VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'disponivel',
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela: MOTORISTAS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS motoristas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        cpf VARCHAR(14) NOT NULL UNIQUE,
        contato VARCHAR(20),
        observacoes TEXT,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela: FUNCIONÁRIOS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS funcionarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        cpf VARCHAR(14) NOT NULL UNIQUE,
        funcao VARCHAR(100) NOT NULL,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela: VIAGENS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS viagens (
        id SERIAL PRIMARY KEY,
        caminhao_id INTEGER NOT NULL REFERENCES caminhoes(id) ON DELETE RESTRICT,
        motorista_id INTEGER NOT NULL REFERENCES motoristas(id) ON DELETE RESTRICT,
        funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id) ON DELETE RESTRICT,
        rota VARCHAR(200) NOT NULL,
        mercadoria VARCHAR(200) NOT NULL,
        nota_fiscal VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'carregado',
        motivo_retorno VARCHAR(100),
        observacoes_retorno TEXT,
        conferente_retorno VARCHAR(100),
        data_saida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_retorno TIMESTAMP,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela: USUÁRIOS (para login)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        nome VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela: HISTÓRICO
    await pool.query(`
      CREATE TABLE IF NOT EXISTS historico (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id),
        tabela VARCHAR(50) NOT NULL,
        acao VARCHAR(50) NOT NULL,
        registro_id INTEGER NOT NULL,
        dados_antigos JSONB,
        dados_novos JSONB,
        data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Banco de dados PostgreSQL criado com sucesso!');
    process.exit(0);
  } catch (erro) {
    console.error('❌ Erro ao criar banco:', erro);
    process.exit(1);
  }
}

setupBanco();
