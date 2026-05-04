const Viagem = require('../models/viagem');
const { salvarHistorico } = require('../utils/historico');

class ViagemController {
  async listar(req, res) {
    try {
      const viagens = await Viagem.listar(req.empresa_id);
      res.json(viagens);
    } catch (erro) {
      console.error('Erro ao listar viagens:', erro);
      res.status(500).json({ erro: 'Erro ao listar viagens' });
    }
  }

  async criar(req, res) {
    try {
      const { caminhao_id, motorista_id, funcionario_id, rota, mercadoria, nota_fiscal } = req.body;

      if (!caminhao_id || !motorista_id || !funcionario_id || !rota || !mercadoria || !nota_fiscal) {
        return res.status(400).json({ erro: 'Dados incompletos' });
      }

      const caminhao = await Viagem.verificarCaminhao(caminhao_id, req.empresa_id);
      if (!caminhao) {
        return res.status(404).json({ erro: 'Caminhão não encontrado' });
      }
      if (caminhao.status !== 'disponivel') {
        return res.status(400).json({ erro: 'Caminhão não está disponível' });
      }

      const motorista = await Viagem.verificarMotorista(motorista_id, req.empresa_id);
      if (!motorista) {
        return res.status(404).json({ erro: 'Motorista não encontrado' });
      }

      const funcionario = await Viagem.verificarFuncionario(funcionario_id, req.empresa_id);
      if (!funcionario) {
        return res.status(404).json({ erro: 'Funcionário não encontrado' });
      }

      const viagem = await Viagem.criar({
        caminhao_id, motorista_id, funcionario_id,
        rota, mercadoria, nota_fiscal,
        empresa_id: req.empresa_id
      });
      await salvarHistorico(req.user.id, 'criar', 'viagens', viagem.id, null, viagem);
      res.json({ sucesso: true, viagem });
    } catch (erro) {
      console.error('Erro ao criar viagem:', erro);
      res.status(500).json({ erro: 'Erro ao criar viagem' });
    }
  }

  async atualizarStatus(req, res) {
    try {
      const { status, motivo_retorno, observacoes_retorno } = req.body;
      const { id } = req.params;

      if (!Viagem.statusValidos.includes(status)) {
        return res.status(400).json({ erro: 'Status inválido' });
      }

      if (status === 'retorno_problema' && !motivo_retorno) {
        return res.status(400).json({ erro: 'Motivo é obrigatório para retorno com problema' });
      }

      const viagem = await Viagem.buscarPorId(id);
      if (!viagem) {
        return res.status(404).json({ erro: 'Viagem não encontrada' });
      }

      await Viagem.atualizarStatus(id, viagem.caminhao_id, { status, motivo_retorno, observacoes_retorno });
      await salvarHistorico(req.user.id, 'atualizar_status', 'viagens', id, viagem, { status, motivo_retorno, observacoes_retorno });
      res.json({ sucesso: true, mensagem: 'Viagem atualizada com sucesso' });
    } catch (erro) {
      console.error('Erro ao atualizar viagem:', erro);
      res.status(500).json({ erro: 'Erro ao atualizar viagem' });
    }
  }

  async buscar(req, res) {
    try {
      const viagens = await Viagem.buscar(req.params.termo, req.empresa_id);
      res.json(viagens);
    } catch (erro) {
      console.error('Erro ao buscar viagens:', erro);
      res.status(500).json({ erro: 'Erro ao buscar viagens' });
    }
  }

  async buscarPorData(req, res) {
    try {
      const { dataInicio, dataFim } = req.params;
      const viagens = await Viagem.buscarPorData(dataInicio, dataFim, req.empresa_id);
      res.json(viagens);
    } catch (erro) {
      console.error('Erro ao buscar viagens por data:', erro);
      res.status(500).json({ erro: 'Erro ao buscar viagens' });
    }
  }
}

module.exports = new ViagemController();
