async function salvarHistorico(usuarioId, acao, tabela, registroId, dadosAntigos = null, dadosNovos = null) {
  try {
    await global.db.query(
      `INSERT INTO historico (usuario_id, acao, tabela, registro_id, dados_antigos, dados_novos)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [usuarioId, acao, tabela, registroId, dadosAntigos, dadosNovos]
    );
  } catch (erro) {
    console.error('Erro ao salvar histórico:', erro);
  }
}

module.exports = { salvarHistorico };
