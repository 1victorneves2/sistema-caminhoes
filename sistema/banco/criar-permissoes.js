require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function criarPermissoes() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Garantir que tabela empresas existe com ao menos id=1
    await client.query(`
      CREATE TABLE IF NOT EXISTS empresas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        cnpj VARCHAR(18),
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      INSERT INTO empresas (id, nome) VALUES (1, 'Empresa Padrão')
      ON CONFLICT (id) DO NOTHING
    `);

    // 1. TABELA ROLES
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(50) NOT NULL,
        descricao VARCHAR(255),
        empresa_id INTEGER REFERENCES empresas(id),
        UNIQUE(nome, empresa_id)
      )
    `);
    console.log('✅ Tabela roles criada');

    // 2. TABELA PERMISSOES
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissoes (
        id SERIAL PRIMARY KEY,
        modulo VARCHAR(50) NOT NULL,
        acao VARCHAR(50) NOT NULL,
        descricao VARCHAR(255),
        UNIQUE(modulo, acao)
      )
    `);
    console.log('✅ Tabela permissoes criada');

    // 3. TABELA ROLE_PERMISSOES
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissoes (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        permissao_id INTEGER REFERENCES permissoes(id) ON DELETE CASCADE,
        UNIQUE(role_id, permissao_id)
      )
    `);
    console.log('✅ Tabela role_permissoes criada');

    // 4. ADICIONAR role_id EM USUARIOS (idempotente)
    await client.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id)
    `);
    console.log('✅ Coluna role_id adicionada em usuarios');

    // 5. ROLES PADRÃO
    await client.query(`
      INSERT INTO roles (nome, descricao, empresa_id) VALUES
        ('admin',     'Administrador geral do sistema',     1),
        ('operador',  'Operador de operações',               1),
        ('motorista', 'Motorista/Conferente de entregas',    1)
      ON CONFLICT (nome, empresa_id) DO NOTHING
    `);
    console.log('✅ Roles padrão inseridas');

    // 6. PERMISSÕES PADRÃO
    await client.query(`
      INSERT INTO permissoes (modulo, acao, descricao) VALUES
        -- Caminhões
        ('caminhoes',    'listar',              'Listar caminhões'),
        ('caminhoes',    'criar',               'Criar novo caminhão'),
        ('caminhoes',    'editar',              'Editar caminhão'),
        ('caminhoes',    'deletar',             'Deletar caminhão'),
        -- Funcionários
        ('funcionarios', 'listar',              'Listar funcionários'),
        ('funcionarios', 'criar',               'Criar funcionário'),
        ('funcionarios', 'editar',              'Editar funcionário'),
        ('funcionarios', 'deletar',             'Deletar funcionário'),
        -- Carregamentos
        ('carregamentos','listar',              'Listar carregamentos'),
        ('carregamentos','criar',               'Criar carregamento'),
        ('carregamentos','editar',              'Editar carregamento'),
        ('carregamentos','finalizar',           'Finalizar carregamento'),
        ('carregamentos','transferir_notas',    'Transferir notas com problema'),
        -- Notas
        ('notas',        'listar',              'Listar notas'),
        ('notas',        'criar',               'Criar nota'),
        ('notas',        'editar',              'Editar status nota'),
        ('notas',        'upload_lote',         'Upload em lote de notas'),
        -- Entregas
        ('entregas',     'listar_minhas',       'Listar minhas entregas'),
        ('entregas',     'atualizar_status',    'Atualizar status da entrega'),
        ('entregas',     'adicionar_observacao','Adicionar observação'),
        ('entregas',     'finalizar',           'Finalizar entrega'),
        -- Estatísticas
        ('estatisticas', 'listar',              'Visualizar estatísticas'),
        ('estatisticas', 'download',            'Download de relatórios'),
        -- Financeiro
        ('financeiro',   'listar',              'Visualizar financeiro'),
        ('financeiro',   'aprovar',             'Aprovar carregamentos'),
        ('financeiro',   'rejeitar',            'Rejeitar carregamentos'),
        -- Administração
        ('admin',        'gerenciar_usuarios',  'Gerenciar usuários e acesso'),
        ('admin',        'gerenciar_roles',     'Gerenciar roles'),
        ('admin',        'gerenciar_permissoes','Gerenciar permissões'),
        ('admin',        'historico',           'Visualizar histórico'),
        ('admin',        'auditoria',           'Visualizar auditoria')
      ON CONFLICT (modulo, acao) DO NOTHING
    `);
    console.log('✅ Permissões padrão inseridas');

    // 7. ASSOCIAR PERMISSÕES AOS ROLES
    const roles = await client.query(
      `SELECT id, nome FROM roles WHERE empresa_id = 1`
    );
    const roleMap = {};
    roles.rows.forEach(r => { roleMap[r.nome] = r.id; });

    // ADMIN: todas as permissões
    await client.query(`
      INSERT INTO role_permissoes (role_id, permissao_id)
      SELECT $1, id FROM permissoes
      ON CONFLICT (role_id, permissao_id) DO NOTHING
    `, [roleMap.admin]);

    // OPERADOR: carregamentos, notas, estatísticas, funcionários (sem deletar)
    await client.query(`
      INSERT INTO role_permissoes (role_id, permissao_id)
      SELECT $1, id FROM permissoes
      WHERE modulo IN ('carregamentos', 'notas', 'estatisticas', 'funcionarios')
        AND acao NOT IN ('deletar')
      ON CONFLICT (role_id, permissao_id) DO NOTHING
    `, [roleMap.operador]);

    // MOTORISTA: apenas entregas
    await client.query(`
      INSERT INTO role_permissoes (role_id, permissao_id)
      SELECT $1, id FROM permissoes
      WHERE modulo = 'entregas'
      ON CONFLICT (role_id, permissao_id) DO NOTHING
    `, [roleMap.motorista]);

    console.log('✅ Permissões associadas aos roles');

    // 8. ÍNDICES
    await client.query(`CREATE INDEX IF NOT EXISTS idx_usuarios_role_id      ON usuarios(role_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_role_permissoes_role   ON role_permissoes(role_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_permissoes_modulo_acao ON permissoes(modulo, acao)`);
    console.log('✅ Índices criados');

    // Sincronizar role_id nos usuários existentes (usa campo role string atual)
    await client.query(`
      UPDATE usuarios u
      SET role_id = r.id
      FROM roles r
      WHERE r.nome = u.role
        AND r.empresa_id = COALESCE(u.empresa_id, 1)
        AND u.role_id IS NULL
    `);
    console.log('✅ role_id sincronizado nos usuários existentes');

    await client.query('COMMIT');

    // Resumo
    const contagens = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM roles)         AS roles,
        (SELECT COUNT(*) FROM permissoes)    AS permissoes,
        (SELECT COUNT(*) FROM role_permissoes) AS associacoes
    `);
    const c = contagens.rows[0];
    console.log('\n========================================');
    console.log('✅ Permissões criadas!');
    console.log(`   Roles:       ${c.roles}`);
    console.log(`   Permissões:  ${c.permissoes}`);
    console.log(`   Associações: ${c.associacoes}`);
    console.log('========================================\n');

    process.exit(0);
  } catch (erro) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migration:', erro.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

criarPermissoes();
