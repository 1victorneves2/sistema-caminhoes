const { notificarAdmins } = require('../websocket');

class LocalizacaoController {

  // POST /api/localizacoes
  // Salva posição e notifica admins via WebSocket
  static async salvar(req, res) {
    try {
      const { caminhao_id, carregamento_id, latitude, longitude, velocidade, precisao } = req.body;

      if (!caminhao_id || latitude == null || longitude == null) {
        return res.status(400).json({ erro: 'caminhao_id, latitude e longitude são obrigatórios' });
      }

      // Verificar que o caminhão pertence à empresa
      const check = await global.db.query(
        `SELECT id FROM caminhoes WHERE id = $1 AND empresa_id = $2`,
        [caminhao_id, req.empresa_id]
      );
      if (check.rows.length === 0) {
        return res.status(404).json({ erro: 'Caminhão não encontrado' });
      }

      const result = await global.db.query(
        `INSERT INTO localizacoes
           (caminhao_id, carregamento_id, latitude, longitude, velocidade, precisao, empresa_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, timestamp`,
        [
          caminhao_id,
          carregamento_id || null,
          latitude,
          longitude,
          velocidade || null,
          precisao || null,
          req.empresa_id
        ]
      );

      // Buscar placa para o payload WS
      const placaResult = await global.db.query(
        `SELECT placa FROM caminhoes WHERE id = $1`,
        [caminhao_id]
      );
      const placa = placaResult.rows[0]?.placa || '';

      notificarAdmins('GPS_ATUALIZADO', {
        caminhao_id: parseInt(caminhao_id),
        carregamento_id: carregamento_id ? parseInt(carregamento_id) : null,
        placa,
        motorista: req.user.nome,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        velocidade: velocidade ? parseFloat(velocidade) : null,
        timestamp: result.rows[0].timestamp
      });

      res.status(201).json({ sucesso: true, id: result.rows[0].id });
    } catch (erro) {
      console.error('Erro ao salvar localização:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  // GET /api/localizacoes/:caminhao_id/ultima
  static async ultima(req, res) {
    try {
      const { caminhao_id } = req.params;

      const result = await global.db.query(
        `SELECT l.*, c.placa, f.nome AS motorista_nome
         FROM localizacoes l
         JOIN caminhoes c ON c.id = l.caminhao_id
         LEFT JOIN carregamentos carr ON carr.id = l.carregamento_id
         LEFT JOIN funcionarios f ON f.id = carr.motorista_id
         WHERE l.caminhao_id = $1 AND l.empresa_id = $2
         ORDER BY l.timestamp DESC
         LIMIT 1`,
        [caminhao_id, req.empresa_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ erro: 'Nenhuma localização encontrada' });
      }

      res.json({ sucesso: true, dados: result.rows[0] });
    } catch (erro) {
      console.error('Erro ao buscar última localização:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  // GET /api/localizacoes/:caminhao_id/rota?data=YYYY-MM-DD
  static async rota(req, res) {
    try {
      const { caminhao_id } = req.params;
      const data = req.query.data || new Date().toISOString().split('T')[0];

      const result = await global.db.query(
        `SELECT latitude, longitude, velocidade, timestamp
         FROM localizacoes
         WHERE caminhao_id = $1
           AND empresa_id  = $2
           AND DATE(timestamp) = $3
         ORDER BY timestamp ASC`,
        [caminhao_id, req.empresa_id, data]
      );

      res.json({ sucesso: true, dados: result.rows, total: result.rows.length });
    } catch (erro) {
      console.error('Erro ao buscar rota:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }

  // GET /api/localizacoes/ativas  — última posição de todos os caminhões em rota
  static async todasAtivas(req, res) {
    try {
      const result = await global.db.query(
        `SELECT DISTINCT ON (l.caminhao_id)
           l.caminhao_id, l.carregamento_id,
           l.latitude, l.longitude, l.velocidade, l.timestamp,
           c.placa, c.tipo,
           f.nome AS motorista_nome,
           carr.status AS carregamento_status
         FROM localizacoes l
         JOIN caminhoes c ON c.id = l.caminhao_id
         LEFT JOIN carregamentos carr ON carr.id = l.carregamento_id
         LEFT JOIN funcionarios f ON f.id = carr.motorista_id
         WHERE l.empresa_id = $1
           AND l.timestamp > NOW() - INTERVAL '2 hours'
         ORDER BY l.caminhao_id, l.timestamp DESC`,
        [req.empresa_id]
      );

      res.json({ sucesso: true, dados: result.rows });
    } catch (erro) {
      console.error('Erro ao buscar localizações ativas:', erro);
      res.status(500).json({ erro: erro.message });
    }
  }
}

module.exports = LocalizacaoController;
