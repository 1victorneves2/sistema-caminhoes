// ============================================================
// HELPERS
// ============================================================

function fetchComToken(url, options = {}) {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return Promise.resolve(null);
  }
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };
  return fetch(url, { ...options, headers }).then(response => {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      localStorage.removeItem('empresa_id');
      document.cookie = 'token=; path=/; max-age=0';
      alert('Sessão expirada. Faça login novamente.');
      window.location.href = '/login.html';
      return null;
    }
    return response;
  });
}

function mostrarNotificacao(msg, erro = false) {
  const n = document.createElement('div');
  n.className = 'notificacao' + (erro ? ' notificacao-erro' : '');
  n.textContent = msg;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3500);
}

function fecharModal(id) {
  document.getElementById(id).classList.remove('ativo');
}

// ============================================================
// CARREGAR CARREGAMENTOS
// ============================================================

async function carregarCarregamentos() {
  const resp = await fetchComToken('/api/carregamentos');
  if (!resp) return;
  const data = await resp.json();
  if (data.erro) { mostrarNotificacao(data.erro, true); return; }

  const lista = Array.isArray(data) ? data : (data.dados || data.carregamentos || []);
  const tbody = document.getElementById('tabelaCarregamentos');
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:#94a3b8;">Nenhum carregamento encontrado.</td></tr>';
    return;
  }

  lista.forEach(c => {
    const statusCor = {
      carregado:  '#3b82f6',
      em_rota:    '#f59e0b',
      entregue:   '#10b981',
      concluido:  '#64748b'
    }[c.status] || '#94a3b8';

    const totalNotas = c.total_notas || 0;
    const entregues  = c.notas_entregues || 0;
    const pct = totalNotas > 0 ? Math.round((entregues / totalNotas) * 100) : 0;

    tbody.innerHTML += `
      <tr>
        <td>#${c.id}</td>
        <td>${c.numero_carregamento || '—'}</td>
        <td>${c.placa || '—'}</td>
        <td>${c.motorista_nome || '—'}</td>
        <td>${c.conferente_nome || '—'}</td>
        <td>${totalNotas}</td>
        <td>${entregues} <small style="color:#94a3b8;">(${pct}%)</small></td>
        <td><span class="status-badge" style="background:${statusCor}22;color:${statusCor};border:1px solid ${statusCor}55;">${c.status}</span></td>
        <td><span class="status-badge sf-${c.status_financeiro || 'pendente'}" style="font-size:10px;">
          ${sfLabel(c.status_financeiro)}
        </span></td>
        <td>
          <button class="btn-acao btn-ver" onclick="verNotas(${c.id})">Ver Notas</button>
          ${c.status !== 'concluido'
            ? `<button class="btn-acao btn-finalizar" onclick="confirmarFinalizar(${c.id})">Finalizar</button>`
            : ''}
          ${podeEnviarFinanceiro(c)
            ? `<button class="btn-financeiro" onclick="abrirModalFinanceiro(${c.id})">💰 Financeiro</button>`
            : ''}
        </td>
      </tr>
    `;
  });
}

function sfLabel(sf) {
  return {
    pendente:           'Pendente',
    pronto_financeiro:  '✓ Pronto',
    enviado_financeiro: '→ Enviado',
    aprovado:           '✅ Aprovado',
    rejeitado:          '✗ Rejeitado'
  }[sf] || sf || 'Pendente';
}

function podeEnviarFinanceiro(c) {
  const sf = c.status_financeiro || 'pendente';
  return !['aprovado', 'enviado_financeiro'].includes(sf);
}

// ============================================================
// CRIAR CARREGAMENTO
// ============================================================

async function abrirModalCriar() {
  document.getElementById('modalCriar').classList.add('ativo');

  // Caminhões disponíveis
  const rc = await fetchComToken('/api/caminhoes');
  if (!rc) return;
  const caminhoes = await rc.json();
  const selC = document.getElementById('selCaminhao');
  selC.innerHTML = '<option value="">Selecione o caminhão</option>';
  (Array.isArray(caminhoes) ? caminhoes : []).forEach(c => {
    if (c.status === 'disponivel' || c.ativo) {
      selC.innerHTML += `<option value="${c.id}">${c.placa} — ${c.tipo}</option>`;
    }
  });

  // Motoristas
  const rm = await fetchComToken('/api/funcionarios?funcao=Motorista');
  if (!rm) return;
  const motData = await rm.json();
  const motoristas = Array.isArray(motData) ? motData : (motData.dados || motData.funcionarios || []);
  const selM = document.getElementById('selMotorista');
  selM.innerHTML = '<option value="">Selecione o motorista</option>';
  motoristas.forEach(f => {
    selM.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
  });

  // Conferentes
  const rf = await fetchComToken('/api/funcionarios?funcao=Conferente');
  if (!rf) return;
  const confData = await rf.json();
  const conferentes = Array.isArray(confData) ? confData : (confData.dados || confData.funcionarios || []);
  const selF = document.getElementById('selConferente');
  selF.innerHTML = '<option value="">Selecione o conferente</option>';
  conferentes.forEach(f => {
    selF.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
  });
}

async function criarCarregamento() {
  const numero_carregamento = document.getElementById('inputNumeroCarregamento').value.trim();
  const caminhao_id         = document.getElementById('selCaminhao').value;
  const motorista_id        = document.getElementById('selMotorista').value;
  const conferente_id       = document.getElementById('selConferente').value;

  if (!numero_carregamento) {
    mostrarNotificacao('Preencha o número do carregamento.', true);
    return;
  }
  if (!caminhao_id || !motorista_id || !conferente_id) {
    mostrarNotificacao('Selecione caminhão, motorista e conferente.', true);
    return;
  }

  const resp = await fetchComToken('/api/carregamentos', {
    method: 'POST',
    body: JSON.stringify({ numero_carregamento, caminhao_id, motorista_id, conferente_id })
  });
  if (!resp) return;
  const data = await resp.json();
  if (data.erro) { mostrarNotificacao(data.erro, true); return; }

  mostrarNotificacao('Carregamento criado com sucesso!');
  document.getElementById('inputNumeroCarregamento').value = '';
  fecharModal('modalCriar');
  carregarCarregamentos();
}

// ============================================================
// VER NOTAS
// ============================================================

let carregamentoAtivo = null;

async function verNotas(id) {
  carregamentoAtivo = id;
  document.getElementById('painelNotas').style.display = 'block';
  document.getElementById('painelNotas').scrollIntoView({ behavior: 'smooth' });
  await recarregarNotas();
}

async function recarregarNotas() {
  const id = carregamentoAtivo;
  if (!id) return;

  // Detalhes do carregamento
  const rd = await fetchComToken(`/api/carregamentos/${id}`);
  if (!rd) return;
  const det = await rd.json();
  const c = det.dados || det.carregamento || det;

  document.getElementById('detalheCarregamento').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:1.5rem;">
      <div class="info-card"><label>Caminhão</label><span>${c.placa || '—'}</span></div>
      <div class="info-card"><label>Motorista</label><span>${c.motorista_nome || '—'}</span></div>
      <div class="info-card"><label>Conferente</label><span>${c.conferente_nome || '—'}</span></div>
      <div class="info-card"><label>Data Saída</label><span>${c.data_saida ? new Date(c.data_saida).toLocaleDateString('pt-BR') : '—'}</span></div>
      <div class="info-card"><label>Status</label><span>${c.status || '—'}</span></div>
    </div>
  `;

  // Stats
  const rs = await fetchComToken(`/api/notas/${id}/stats`);
  if (!rs) return;
  const statsData = await rs.json();
  const s = statsData.dados || statsData;

  const total        = parseInt(s.total_notas)         || 0;
  const entregues    = parseInt(s.notas_entregues)      || 0;
  const problema     = parseInt(s.notas_problema)       || 0;
  const naoEnc       = parseInt(s.notas_nao_encontrado) || 0;
  const pendente     = parseInt(s.notas_pendente)       || 0;

  document.getElementById('statsCarregamento').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:1.5rem;">
      <div class="stat-card stat-total">   <span>${total}</span>    <label>Total</label></div>
      <div class="stat-card stat-entregue"><span>${entregues}</span> <label>Entregues</label></div>
      <div class="stat-card stat-problema"><span>${problema}</span>  <label>Problema</label></div>
      <div class="stat-card stat-nao">    <span>${naoEnc}</span>    <label>Não Enc.</label></div>
      <div class="stat-card stat-pendente"><span>${pendente}</span>  <label>Pendente</label></div>
    </div>
  `;

  renderizarProgresso({ total, entregues, problema, naoEnc, pendente });

  // Mostrar/ocultar botão finalizar
  const podeFinalizar = total > 0 && pendente === 0 && problema === 0;
  document.getElementById('btnFinalizarPainel').style.display = podeFinalizar ? 'inline-block' : 'none';
  document.getElementById('btnFinalizarPainel').onclick = () => confirmarFinalizar(id);

  // Listar notas
  const rn = await fetchComToken(`/api/notas/${id}`);
  if (!rn) return;
  const notasData = await rn.json();
  const notas = Array.isArray(notasData) ? notasData : (notasData.dados || notasData.notas || []);
  _notasCache = notas;

  const tbody = document.getElementById('tabelaNotas');
  tbody.innerHTML = '';

  if (notas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:1.5rem;color:#94a3b8;">Nenhuma nota. Adicione notas abaixo.</td></tr>';
    return;
  }

  const corStatus = {
    pendente:       { bg: '#374151', cor: '#9ca3af' },
    entregue:       { bg: '#065f4633', cor: '#10b981' },
    problema:       { bg: '#7f1d1d33', cor: '#ef4444' },
    nao_encontrado: { bg: '#78350f33', cor: '#f59e0b' },
    realocado:      { bg: '#4c1d9533', cor: '#a78bfa' }
  };

  const labelPagamento = {
    dinheiro:    'Dinheiro',
    pix:         'PIX',
    boleto:      'Boleto',
    cartao:      'Cartão',
    transferencia: 'Transferência',
    a_prazo:     'A Prazo'
  };

  notas.forEach((n, i) => {
    const cs = corStatus[n.status] || corStatus.pendente;
    const podeAlterar = n.status !== 'entregue' && n.status !== 'realocado';

    const canhotoIcon = n.canhoto_assinado
      ? `<span style="color:#10b981;font-weight:700;" title="Assinado em ${n.data_assinatura ? new Date(n.data_assinatura).toLocaleDateString('pt-BR') : ''}">✓ Assinado</span>`
      : `<span style="color:#64748b;">—</span>`;

    const boletoTxt = n.numero_boleto
      ? `<span style="color:#60a5fa;font-size:11px;">${n.numero_boleto}${n.data_vencimento_boleto ? '<br><small style="color:#94a3b8;">' + new Date(n.data_vencimento_boleto + 'T00:00:00').toLocaleDateString('pt-BR') + '</small>' : ''}</span>`
      : `<span style="color:#64748b;">—</span>`;

    const pagTxt = n.tipo_pagamento
      ? `<span style="color:#f59e0b;">${labelPagamento[n.tipo_pagamento] || n.tipo_pagamento}</span>`
      : `<span style="color:#64748b;">—</span>`;

    tbody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${n.numero_nota}</strong></td>
        <td>${n.descricao || '—'}</td>
        <td>${n.quantidade || 1}</td>
        <td><span class="status-badge" style="background:${cs.bg};color:${cs.cor};border:1px solid ${cs.cor}44;">${n.status}</span></td>
        <td>${canhotoIcon}</td>
        <td>${boletoTxt}</td>
        <td>${pagTxt}</td>
        <td>
          ${podeAlterar ? `
            <button class="btn-acao btn-entregue"       onclick="atualizarStatusNota(${id},${n.id},'entregue')">✓</button>
            <button class="btn-acao btn-problema"        onclick="atualizarStatusNota(${id},${n.id},'problema')">✗</button>
            <button class="btn-acao btn-nao-encontrado"  onclick="atualizarStatusNota(${id},${n.id},'nao_encontrado')">?</button>
          ` : ''}
          <button class="btn-acao" style="background:#1e40af22;color:#60a5fa;border:1px solid #1e40af55;" onclick="abrirModalDetalhesNota(${id},${n.id})">✏</button>
        </td>
      </tr>
    `;
  });
}

// ============================================================
// PROGRESSO
// ============================================================

function renderizarProgresso({ total, entregues, problema, naoEnc, pendente }) {
  if (total === 0) {
    document.getElementById('barraProgresso').innerHTML =
      '<div style="height:100%;background:#1e293b;border-radius:8px;"></div>';
    return;
  }
  const pE = (entregues / total * 100).toFixed(1);
  const pP = (problema  / total * 100).toFixed(1);
  const pN = (naoEnc    / total * 100).toFixed(1);
  const pD = (pendente  / total * 100).toFixed(1);

  document.getElementById('barraProgresso').innerHTML = `
    <div style="display:flex;height:100%;border-radius:8px;overflow:hidden;">
      ${pE > 0 ? `<div style="width:${pE}%;background:#10b981;" title="Entregues ${pE}%"></div>` : ''}
      ${pP > 0 ? `<div style="width:${pP}%;background:#ef4444;" title="Problema ${pP}%"></div>` : ''}
      ${pN > 0 ? `<div style="width:${pN}%;background:#f59e0b;" title="Não encontrado ${pN}%"></div>` : ''}
      ${pD > 0 ? `<div style="width:${pD}%;background:#374151;" title="Pendente ${pD}%"></div>` : ''}
    </div>
    <div style="display:flex;gap:16px;margin-top:8px;font-size:12px;flex-wrap:wrap;">
      <span style="color:#10b981;">■ Entregues ${pE}%</span>
      <span style="color:#ef4444;">■ Problema ${pP}%</span>
      <span style="color:#f59e0b;">■ Não Enc. ${pN}%</span>
      <span style="color:#94a3b8;">■ Pendente ${pD}%</span>
    </div>
  `;
}

// ============================================================
// ADICIONAR NOTA INDIVIDUAL
// ============================================================

async function adicionarNota() {
  const id     = carregamentoAtivo;
  const numero = document.getElementById('inputNumeroNota').value.trim();
  const desc   = document.getElementById('inputDescNota').value.trim();
  const qtd    = parseInt(document.getElementById('inputQtdNota').value) || 1;

  if (!numero) { mostrarNotificacao('Informe o número da nota.', true); return; }

  const resp = await fetchComToken(`/api/notas/${id}`, {
    method: 'POST',
    body: JSON.stringify({ numero_nota: numero, descricao: desc, quantidade: qtd })
  });
  if (!resp) return;
  const data = await resp.json();
  if (data.erro) { mostrarNotificacao(data.erro, true); return; }

  mostrarNotificacao('Nota adicionada!');
  document.getElementById('inputNumeroNota').value = '';
  document.getElementById('inputDescNota').value   = '';
  document.getElementById('inputQtdNota').value    = '1';
  await recarregarNotas();
}

// ============================================================
// UPLOAD CSV
// ============================================================

async function uploadCSV(arquivo) {
  const id = carregamentoAtivo;
  if (!arquivo) return;

  const texto = await arquivo.text();
  const linhas = texto.split('\n').filter(l => l.trim());

  // Pular cabeçalho se existir
  const inicio = linhas[0].toLowerCase().includes('numero') ? 1 : 0;
  const notas = [];

  for (let i = inicio; i < linhas.length; i++) {
    const cols = linhas[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (!cols[0]) continue;
    notas.push({
      numero_nota: cols[0],
      descricao:   cols[1] || '',
      quantidade:  parseInt(cols[2]) || 1
    });
  }

  if (notas.length === 0) {
    mostrarNotificacao('Nenhuma nota válida encontrada no CSV.', true);
    return;
  }

  const resp = await fetchComToken(`/api/notas/${id}/lote`, {
    method: 'POST',
    body: JSON.stringify({ notas })
  });
  if (!resp) return;
  const data = await resp.json();
  if (data.erro) { mostrarNotificacao(data.erro, true); return; }

  mostrarNotificacao(`${notas.length} notas importadas com sucesso!`);
  document.getElementById('inputCSV').value = '';
  await recarregarNotas();
}

// ============================================================
// ATUALIZAR STATUS NOTA
// ============================================================

async function atualizarStatusNota(carregamento_id, nota_id, status) {
  const resp = await fetchComToken(`/api/notas/${carregamento_id}/notas/${nota_id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
  if (!resp) return;
  const data = await resp.json();
  if (data.erro) { mostrarNotificacao(data.erro, true); return; }

  await recarregarNotas();
}

// ============================================================
// TRANSFERIR NOTAS COM PROBLEMA
// ============================================================

async function abrirModalTransferir() {
  document.getElementById('modalTransferir').classList.add('ativo');

  const resp = await fetchComToken('/api/carregamentos');
  if (!resp) return;
  const data = await resp.json();
  const lista = Array.isArray(data) ? data : (data.dados || data.carregamentos || []);

  const sel = document.getElementById('selDestinoTransferir');
  sel.innerHTML = '<option value="">Selecione o carregamento destino</option>';
  lista.forEach(c => {
    if (c.id !== carregamentoAtivo && c.status !== 'concluido') {
      sel.innerHTML += `<option value="${c.id}">#${c.id} — ${c.placa || ''} (${c.status})</option>`;
    }
  });
}

async function transferirNotasProblema() {
  const destino_id = document.getElementById('selDestinoTransferir').value;
  if (!destino_id) { mostrarNotificacao('Selecione o carregamento destino.', true); return; }

  // Buscar notas com problema/nao_encontrado
  const rn = await fetchComToken(`/api/notas/${carregamentoAtivo}`);
  if (!rn) return;
  const notasData = await rn.json();
  const notas = Array.isArray(notasData) ? notasData : (notasData.dados || notasData.notas || []);
  const comProblema = notas.filter(n => n.status === 'problema' || n.status === 'nao_encontrado');

  if (comProblema.length === 0) {
    mostrarNotificacao('Nenhuma nota com problema para transferir.', true);
    fecharModal('modalTransferir');
    return;
  }

  // Criar lote no destino
  const notasLote = comProblema.map(n => ({
    numero_nota: n.numero_nota,
    descricao:   n.descricao,
    quantidade:  n.quantidade
  }));

  const resp = await fetchComToken(`/api/notas/${destino_id}/lote`, {
    method: 'POST',
    body: JSON.stringify({ notas: notasLote })
  });
  if (!resp) return;
  const data = await resp.json();
  if (data.erro) { mostrarNotificacao(data.erro, true); return; }

  mostrarNotificacao(`${comProblema.length} notas transferidas para carregamento #${destino_id}!`);
  fecharModal('modalTransferir');
  await recarregarNotas();
}

// ============================================================
// FINALIZAR CARREGAMENTO
// ============================================================

async function confirmarFinalizar(id) {
  if (!confirm(`Finalizar carregamento #${id}? Esta ação não pode ser desfeita.`)) return;
  await finalizarCarregamento(id);
}

async function finalizarCarregamento(id) {
  const resp = await fetchComToken(`/api/carregamentos/${id}/finalizar`, { method: 'PUT' });
  if (!resp) return;
  const data = await resp.json();
  if (data.erro) { mostrarNotificacao(data.erro, true); return; }

  mostrarNotificacao('Carregamento finalizado!');
  if (carregamentoAtivo === id) {
    document.getElementById('painelNotas').style.display = 'none';
    carregamentoAtivo = null;
  }
  carregarCarregamentos();
}

// ============================================================
// FINANCEIRO
// ============================================================

let _idFinanceiro = null;
let _problemasFinanceiro = 0;

async function abrirModalFinanceiro(id) {
  _idFinanceiro = id;
  document.getElementById('modalFinanceiro').classList.add('ativo');
  document.getElementById('inputMotivoFinanceiro').value = '';

  // Verificar notas problemáticas
  const rn = await fetchComToken(`/api/notas/${id}`);
  if (!rn) return;
  const notasData = await rn.json();
  const notas = Array.isArray(notasData) ? notasData : (notasData.dados || notasData.notas || []);
  const comProblema = notas.filter(n => ['problema','nao_encontrado','devolucao_parcial','sac'].includes(n.status));

  _problemasFinanceiro = comProblema.length;

  const aviso = document.getElementById('financeiroAviso');
  const destinoWrap = document.getElementById('financeiroDestinoWrap');

  if (comProblema.length > 0) {
    aviso.style.display = 'block';
    aviso.innerHTML = `⚠️ Existem <strong>${comProblema.length}</strong> nota(s) com ocorrência. Selecione um carregamento SAC para receber essas notas antes de enviar ao financeiro.`;
    destinoWrap.style.display = 'block';

    // Carregar carregamentos disponíveis como destino SAC
    const rc = await fetchComToken('/api/carregamentos');
    if (!rc) return;
    const dataC = await rc.json();
    const lista = Array.isArray(dataC) ? dataC : (dataC.dados || dataC.carregamentos || []);
    const sel = document.getElementById('selDestinoFinanceiro');
    sel.innerHTML = '<option value="">Selecione o carregamento SAC...</option>';
    lista.forEach(c => {
      if (c.id !== id && c.status !== 'concluido') {
        sel.innerHTML += `<option value="${c.id}">#${c.id} — ${c.placa || ''} (${c.status})</option>`;
      }
    });
  } else {
    aviso.style.display = 'none';
    destinoWrap.style.display = 'none';
  }
}

async function confirmarEnvioFinanceiro() {
  const id = _idFinanceiro;
  const motivo = document.getElementById('inputMotivoFinanceiro').value.trim();

  if (_problemasFinanceiro > 0) {
    const destino = document.getElementById('selDestinoFinanceiro').value;
    if (!destino) {
      mostrarNotificacao('Selecione o carregamento SAC de destino.', true);
      return;
    }

    // Transferir notas problemáticas (endpoint novo — já inclui marcar pronto_financeiro)
    const resp = await fetchComToken(`/api/carregamentos/${id}/transferir-problemas`, {
      method: 'PUT',
      body: JSON.stringify({ carregamento_destino_id: parseInt(destino), motivo: motivo || 'Envio ao financeiro' })
    });
    if (!resp) return;
    const data = await resp.json();
    if (data.erro) { mostrarNotificacao(data.erro, true); return; }
    mostrarNotificacao(`${data.transferidas} nota(s) transferidas para carregamento SAC #${destino}!`);
  } else {
    // Sem problemas: marcar direto como pronto_financeiro
    const resp = await fetchComToken(`/api/carregamentos/${id}/status-financeiro`, {
      method: 'PUT',
      body: JSON.stringify({ status_financeiro: 'pronto_financeiro' })
    });
    if (!resp) return;
    const data = await resp.json();
    if (data.erro) { mostrarNotificacao(data.erro, true); return; }
    mostrarNotificacao('Carregamento marcado como pronto para financeiro!');
  }

  fecharModal('modalFinanceiro');
  carregarCarregamentos();
}

// ============================================================
// DETALHES DA NOTA (canhoto / boleto / pagamento)
// ============================================================

let _notaDetalhesCarregamento = null;
let _notaDetalhesId = null;
let _notasCache = [];

function abrirModalDetalhesNota(carregamento_id, nota_id) {
  _notaDetalhesCarregamento = carregamento_id;
  _notaDetalhesId = nota_id;

  const nota = _notasCache.find(n => n.id === nota_id) || {};

  document.getElementById('detalheNotaNumero').textContent    = nota.numero_nota || '';
  document.getElementById('detalheNotaDescricao').textContent = nota.descricao || '—';

  document.getElementById('inputCanhoto').checked          = !!nota.canhoto_assinado;
  document.getElementById('inputTipoPagamento').value      = nota.tipo_pagamento || '';
  document.getElementById('inputNumeroBoleto').value       = nota.numero_boleto || '';
  document.getElementById('inputVencimentoBoleto').value   = nota.data_vencimento_boleto
    ? nota.data_vencimento_boleto.substring(0, 10)
    : '';

  document.getElementById('modalDetalhesNota').classList.add('ativo');
}

async function salvarDetalhesNota() {
  const canhoto_assinado       = document.getElementById('inputCanhoto').checked;
  const tipo_pagamento         = document.getElementById('inputTipoPagamento').value || null;
  const numero_boleto          = document.getElementById('inputNumeroBoleto').value.trim() || null;
  const data_vencimento_boleto = document.getElementById('inputVencimentoBoleto').value || null;

  const resp = await fetchComToken(
    `/api/notas/${_notaDetalhesCarregamento}/notas/${_notaDetalhesId}/detalhes`,
    {
      method: 'PUT',
      body: JSON.stringify({ canhoto_assinado, tipo_pagamento, numero_boleto, data_vencimento_boleto })
    }
  );
  if (!resp) return;
  const data = await resp.json();
  if (data.erro) { mostrarNotificacao(data.erro, true); return; }

  mostrarNotificacao('Detalhes da nota salvos!');
  fecharModal('modalDetalhesNota');
  await recarregarNotas();
}

// ============================================================
// INIT
// ============================================================

carregarCarregamentos();
