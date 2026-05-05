require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('ERRO CRÍTICO: JWT_SECRET não definido em .env');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('ERRO CRÍTICO: DATABASE_URL não definido em .env');
  process.exit(1);
}

const express = require('express');
const path = require('path');
const http = require('http');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors());
app.use(express.json());

// Proteção de páginas estáticas — redireciona para login se sem cookie de sessão
app.use((req, res, next) => {
  const urlsPublicas = ['/login.html', '/bem-vindo.html', '/api/auth/login', '/api/auth/registrar', '/', '/index.html'];

  if (urlsPublicas.includes(req.path) || req.path.startsWith('/api')) {
    return next();
  }

  if (!req.path.startsWith('/api')) {
    const cookies = req.headers.cookie || '';
    const match = cookies.match(/(?:^|;\s*)token=([^;]+)/);
    const token = match ? decodeURIComponent(match[1]) : null;

    if (!token) {
      return res.redirect('/login.html');
    }
  }

  next();
});

// Rota raiz — redireciona por token cookie
app.get('/', (req, res) => {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/(?:^|;\s*)token=([^;]+)/);
  if (match) {
    return res.redirect('/bem-vindo.html');
  }
  return res.redirect('/login.html');
});

app.use(express.static(path.join(__dirname, 'publico')));

// ========================================
// BANCO DE DADOS
// ========================================
let pool;
if (process.env.DATABASE_URL.startsWith('sqlite:')) {
  pool = {
    async connect() {
      console.log('✅ Mock SQLite conectado (sem banco real)');
      return this;
    },
    async query() {
      return { rows: [], rowCount: 0 };
    },
    async end() {}
  };
  pool.connect();
} else {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  pool.connect()
    .then(() => console.log('✅ Banco de dados PostgreSQL conectado'))
    .catch(err => {
      console.error('❌ Erro ao conectar no banco:', err);
      process.exit(1);
    });
}

global.db = pool;

// ========================================
// ROTAS
// ========================================
const authRoutes           = require('./routes/rotas_auth');
const caminhaoRoutes       = require('./routes/caminhoes');
const motoristaRoutes      = require('./routes/motoristas');
const funcionarioRoutes    = require('./routes/funcionarios');
const viagemRoutes         = require('./routes/viagens');
const rotasAdmin           = require('./routes/rotas_admin');
const rotasCarregamentos   = require('./routes/carregamentos');
const rotasNotas           = require('./routes/notas');
const rotasEstatisticas    = require('./routes/estatisticas');
const rotasEntregas        = require('./routes/entregas');
const rotasLocalizacoes    = require('./routes/localizacoes');
const rotasUsuarios        = require('./routes/usuarios');
const rotasMotoEntrega     = require('./routes/motorista_entrega');

// ========================================
// WEBSOCKET
// ========================================
const { iniciarWebSocket } = require('./websocket');
const server = http.createServer(app);
const wss = iniciarWebSocket(server);

global.wss = wss;

// ========================================
// USAR ROTAS
// ========================================
app.use('/api/auth',           authRoutes);
app.use('/api/caminhoes',      caminhaoRoutes);
app.use('/api/motoristas',     motoristaRoutes);
app.use('/api/funcionarios',   funcionarioRoutes);
app.use('/api/viagens',        viagemRoutes);
app.use('/api/admin',          rotasAdmin);
app.use('/api/carregamentos',  rotasCarregamentos);
app.use('/api/notas',          rotasNotas);
app.use('/api/estatisticas',   rotasEstatisticas);
app.use('/api/entregas',       rotasEntregas);
app.use('/api/localizacoes',   rotasLocalizacoes);
app.use('/api/usuarios',       rotasUsuarios);
app.use('/api/motorista',      rotasMotoEntrega);

// ========================================
// ROTA NÃO ENCONTRADA
// ========================================
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

// ========================================
// TRATADOR GLOBAL DE ERROS
// ========================================
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(err.status || 500).json({
    erro: err.message || 'Erro interno do servidor'
  });
});

// ========================================
// INICIAR SERVIDOR
// ========================================
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Acesse: http://localhost:${PORT}`);
});
