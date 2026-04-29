require('dotenv').config();

const express = require('express');
const path = require('path');
const http = require('http');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'publico')));

// ========================================
// POSTGRESQL
// ========================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Teste de conexão
pool.connect()
  .then(() => console.log('✅ Banco de dados conectado'))
  .catch(err => {
    console.error('❌ Erro ao conectar no banco:', err);
    process.exit(1);
  });

// Deixar global para usar nas rotas
global.db = pool;

// ========================================
// ROTAS
// ========================================
const rotasCaminhoes = require('./rotas/caminhoes');
const rotasMotoristas = require('./rotas/motoristas');
const rotasViagens = require('./rotas/viagens');
const rotasFuncionarios = require('./rotas/funcionarios');
const rotasAuth = require('./rotas/rotas_auth');
const rotasAdmin = require('./rotas/rotas_admin');

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
app.use('/api/auth', rotasAuth);
app.use('/api/caminhoes', rotasCaminhoes);
app.use('/api/motoristas', rotasMotoristas);
app.use('/api/viagens', rotasViagens);
app.use('/api/funcionarios', rotasFuncionarios);
app.use('/api/admin', rotasAdmin);

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