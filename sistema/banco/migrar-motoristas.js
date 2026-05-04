require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrarMotoristas() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Contar motoristas antes
    const { rows: [{ total }] } = await client.query('SELECT COUNT(*) AS total FROM motoristas');
    console.log(`📋 ${total} motoristas encontrados para migrar`);

    // 2. Copiar motoristas → funcionarios (funcao = 'Motorista')
    //    ON CONFLICT (cpf): se o CPF já existe em funcionarios, apenas atualiza funcao
    const { rows: inseridos } = await client.query(`
      INSERT INTO funcionarios (nome, cpf, funcao, ativo)
      SELECT nome, cpf, 'Motorista', ativo
      FROM motoristas
      ON CONFLICT (cpf) DO UPDATE
        SET funcao = 'Motorista'
      RETURNING id, cpf
    `);
    console.log(`✅ ${inseridos.length} motoristas inseridos/atualizados em funcionarios`);

    // 3. Remover FK viagens.motorista_id → motoristas (para permitir IDs de funcionarios)
    await client.query(`
      ALTER TABLE viagens
        DROP CONSTRAINT IF EXISTS viagens_motorista_id_fkey
    `);
    console.log('🔗 Constraint viagens_motorista_id_fkey removida');

    // 4. Atualizar viagens.motorista_id para apontar aos novos funcionarios.id
    //    (combina por CPF, que é único em ambas as tabelas)
    const { rowCount } = await client.query(`
      UPDATE viagens v
      SET motorista_id = f.id
      FROM funcionarios f
      JOIN motoristas   m ON m.cpf = f.cpf AND f.funcao = 'Motorista'
      WHERE v.motorista_id = m.id
    `);
    console.log(`🔄 ${rowCount} viagens atualizadas para usar IDs de funcionarios`);

    // 5. Adicionar novo FK viagens.motorista_id → funcionarios
    await client.query(`
      ALTER TABLE viagens
        ADD CONSTRAINT viagens_motorista_id_fkey
        FOREIGN KEY (motorista_id) REFERENCES funcionarios(id) ON DELETE RESTRICT
    `);
    console.log('🔗 Novo FK viagens.motorista_id → funcionarios adicionado');

    await client.query('COMMIT');
    console.log('\n✅ Migração concluída com sucesso!');
    console.log('   Motoristas agora vivem em funcionarios (funcao = Motorista)');
    console.log('   Viagens atualizadas para referenciar os novos IDs');
  } catch (erro) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migração — ROLLBACK executado:', erro.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrarMotoristas();
