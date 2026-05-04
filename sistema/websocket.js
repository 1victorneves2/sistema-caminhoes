// WebSocket com autenticação
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-aqui';
let clientes = [];

// ========================================
// INICIAR WEBSOCKET
// ========================================
function iniciarWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    // Verificar autenticação via token na URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      console.log('❌ Cliente não autenticado - desconectando');
      ws.close(4001, 'Token não fornecido');
      return;
    }

    try {
      const decoded = jwt.verify(token, SECRET);
      
      // Armazenar informações do usuário no websocket
      ws.usuario = decoded;
      ws.isAlive = true;

      // Adicionar cliente
      clientes.push(ws);
      console.log(`✅ Cliente ${decoded.nome} conectado. Total: ${clientes.length}`);

      // Enviar confirmação de conexão
      ws.send(JSON.stringify({
        tipo: 'CONECTADO',
        mensagem: 'Conectado ao servidor com sucesso',
        usuario: decoded.nome
      }));

      // ========================================
      // MENSAGENS DO CLIENTE
      // ========================================
      ws.on('message', (mensagem) => {
        try {
          const dados = JSON.parse(mensagem);
          console.log(`Mensagem de ${decoded.nome}:`, dados.tipo);

          // Responder a pong (heartbeat)
          if (dados.tipo === 'PONG') {
            ws.isAlive = true;
            return;
          }

          // Processar outras mensagens
          if (dados.tipo === 'NOTIFICACAO') {
            if (decoded.role === 'admin') {
              notificarTodosClientes(dados.evento, dados.dados);
            }
          }

          // ---- Eventos do fluxo de entrega ----
          if (dados.tipo === 'CHEGOU_LOCAL') {
            notificarAdmins('CHEGOU_LOCAL', {
              carregamento_id: dados.carregamento_id,
              motorista: decoded.nome,
              timestamp: dados.timestamp || new Date().toISOString()
            });
          }

          if (dados.tipo === 'NOTA_ATUALIZADA') {
            notificarAdmins('NOTA_ATUALIZADA', {
              carregamento_id: dados.carregamento_id,
              nota_id: dados.nota_id,
              status: dados.status,
              motorista: decoded.nome,
              timestamp: dados.timestamp || new Date().toISOString()
            });
          }

          if (dados.tipo === 'CARREGAMENTO_FINALIZADO') {
            notificarAdmins('CARREGAMENTO_FINALIZADO', {
              carregamento_id: dados.carregamento_id,
              motorista: decoded.nome,
              timestamp: dados.timestamp || new Date().toISOString()
            });
          }

          // ---- GPS em tempo real ----
          if (dados.tipo === 'GPS') {
            const { caminhao_id, carregamento_id, lat, lng, velocidade, precisao } = dados;
            if (caminhao_id && lat != null && lng != null && global.db && decoded.empresa_id) {
              // Persiste assincronamente sem bloquear o handler
              global.db.query(
                `INSERT INTO localizacoes
                   (caminhao_id, carregamento_id, latitude, longitude, velocidade, precisao, empresa_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [caminhao_id, carregamento_id || null, lat, lng,
                 velocidade || null, precisao || null, decoded.empresa_id]
              ).catch(err => console.error('Erro ao salvar GPS:', err.message));
            }

            notificarAdmins('GPS_ATUALIZADO', {
              caminhao_id,
              carregamento_id: carregamento_id || null,
              motorista: decoded.nome,
              latitude: lat,
              longitude: lng,
              velocidade: velocidade || null,
              timestamp: new Date().toISOString()
            });
          }
        } catch (erro) {
          console.error('Erro ao processar mensagem:', erro);
          ws.send(JSON.stringify({
            tipo: 'ERRO',
            mensagem: 'Formato de mensagem inválido'
          }));
        }
      });

      // ========================================
      // DESCONEXÃO
      // ========================================
      ws.on('close', () => {
        console.log(`⚠️ Cliente ${decoded.nome} desconectado`);
        clientes = clientes.filter(c => c !== ws);
      });

      // ========================================
      // ERROS
      // ========================================
      ws.on('error', (erro) => {
        console.error(`Erro WebSocket para ${decoded.nome}:`, erro);
      });

    } catch (erro) {
      console.log('❌ Token inválido ou expirado - desconectando');
      ws.close(4002, 'Token inválido');
      return;
    }
  });

  // ========================================
  // HEARTBEAT (verificar conexões vivas)
  // ========================================
  const intervaloHeartbeat = setInterval(() => {
    clientes.forEach(ws => {
      if (!ws.isAlive) {
        // Conexão morta, remove
        ws.close();
        return;
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // A cada 30 segundos

  // Limpar heartbeat ao fechar servidor
  wss.on('close', () => {
    clearInterval(intervaloHeartbeat);
  });

  return wss;
}

// ========================================
// NOTIFICAR TODOS OS CLIENTES
// ========================================
function notificarTodosClientes(evento, dados) {
  console.log(`📢 Notificando ${clientes.length} clientes: ${evento}`);
  const mensagem = JSON.stringify({
    tipo: 'NOTIFICACAO',
    evento,
    dados,
    timestamp: new Date().toISOString()
  });

  clientes.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(mensagem);
    }
  });
}

// ========================================
// NOTIFICAR CLIENTE ESPECÍFICO
// ========================================
function notificarCliente(usuarioId, evento, dados) {
  const cliente = clientes.find(c => c.usuario?.id === usuarioId);
  if (cliente && cliente.readyState === WebSocket.OPEN) {
    cliente.send(JSON.stringify({
      tipo: 'NOTIFICACAO',
      evento,
      dados,
      timestamp: new Date().toISOString()
    }));
  }
}

// ========================================
// NOTIFICAR APENAS ADMINS
// ========================================
function notificarAdmins(evento, dados) {
  console.log(`🔔 Notificando admins: ${evento}`);
  const mensagem = JSON.stringify({
    tipo: 'NOTIFICACAO',
    evento,
    dados,
    timestamp: new Date().toISOString()
  });

  clientes.forEach(ws => {
    if (ws.usuario?.role === 'admin' && ws.readyState === WebSocket.OPEN) {
      ws.send(mensagem);
    }
  });
}

module.exports = {
  iniciarWebSocket,
  notificarTodosClientes,
  notificarCliente,
  notificarAdmins
};