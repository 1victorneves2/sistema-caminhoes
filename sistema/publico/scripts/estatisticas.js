// ============================================================
// HELPERS
// ============================================================

function fetchComToken(url, options = {}) {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = '/login.html'; return Promise.resolve(null); }
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

// ============================================================
// STATE
// ============================================================

let graficoPizza  = null;
let graficoBarras = null;
let dadosAtuais   = null;
let modoAtual     = 'dia'; // 'dia' | 'semana' | 'mes'

// ============================================================
// CARREGAR DADOS
// ============================================================

async function carregarEstatisticasDia(data) {
  modoAtual = 'dia';
  const url = `/api/estatisticas/dia${data ? `?data=${data}` : ''}`;
  const resp = await fetchComToken(url);
  if (!resp) return;
  const json = await resp.json();
  if (json.erro) { mostrarErro(json.erro); return; }

  const dados = json.dados || json;
  dadosAtuais = dados;

  renderizarCards(dados);
  renderizarGraficoPizza(dados);
  // Dia único: gráfico de barras com 1 barra
  renderizarGraficoBarras([dados], 'dia');
  renderizarTabela([dados], 'dia');
  document.getElementById('secaoBarras').style.display = 'none'; // só faz sentido em semana/mês
}

async function carregarEstatisticasSemana() {
  modoAtual = 'semana';
  const resp = await fetchComToken('/api/estatisticas/semana');
  if (!resp) return;
  const json = await resp.json();
  if (json.erro) { mostrarErro(json.erro); return; }

  const lista = json.dados || json;
  dadosAtuais = lista;

  // Agregado para os cards
  const agg = agregarLista(lista);
  renderizarCards(agg);

  // Pizza com o agregado
  renderizarGraficoPizza(agg);

  // Barras diárias
  document.getElementById('secaoBarras').style.display = 'block';
  renderizarGraficoBarras(lista, 'semana');
  renderizarTabela(lista, 'semana');
}

async function carregarEstatisticasMes(mes, ano) {
  modoAtual = 'mes';
  const url = `/api/estatisticas/mes?mes=${mes}&ano=${ano}`;
  const resp = await fetchComToken(url);
  if (!resp) return;
  const json = await resp.json();
  if (json.erro) { mostrarErro(json.erro); return; }

  const dados = json.dados || json;
  dadosAtuais = dados;

  const resumo  = dados.resumo  || dados;
  const diarios = dados.diarios || [];

  renderizarCards(resumo);
  renderizarGraficoPizza(resumo);
  document.getElementById('secaoBarras').style.display = 'block';
  renderizarGraficoBarras(diarios, 'mes');
  renderizarTabela(diarios, 'mes');
}

// ============================================================
// AGREGAR LISTA (semana → totais)
// ============================================================

function agregarLista(lista) {
  return lista.reduce((acc, row) => ({
    total_carregamentos: (acc.total_carregamentos || 0) + (parseInt(row.total_carregamentos) || 0),
    total_notas:         (acc.total_notas         || 0) + (parseInt(row.total_notas)         || 0),
    notas_entregues:     (acc.notas_entregues     || 0) + (parseInt(row.notas_entregues)     || 0),
    notas_problema:      (acc.notas_problema      || 0) + (parseInt(row.notas_problema)      || 0),
    notas_nao_encontrado:(acc.notas_nao_encontrado|| 0) + (parseInt(row.notas_nao_encontrado)|| 0),
    notas_pendente:      (acc.notas_pendente      || 0) + (parseInt(row.notas_pendente)      || 0),
  }), {});
}

// ============================================================
// CARDS
// ============================================================

function renderizarCards(dados) {
  const total    = parseInt(dados.total_notas)          || 0;
  const carreg   = parseInt(dados.total_carregamentos)  || 0;
  const entregue = parseInt(dados.notas_entregues)      || 0;
  const problema = parseInt(dados.notas_problema)       || 0;
  const naoEnc   = parseInt(dados.notas_nao_encontrado) || 0;
  const pendente = parseInt(dados.notas_pendente)       || 0;

  const pctE = total > 0 ? ((entregue / total) * 100).toFixed(1) : '0.0';
  const pctP = total > 0 ? ((problema  / total) * 100).toFixed(1) : '0.0';

  document.getElementById('cardCarregamentos').innerHTML = `
    <div class="card-stat">
      <div class="card-icon">🚛</div>
      <div class="card-num">${carreg.toLocaleString('pt-BR')}</div>
      <div class="card-lbl">Carregamentos</div>
    </div>`;

  document.getElementById('cardNotas').innerHTML = `
    <div class="card-stat">
      <div class="card-icon">📄</div>
      <div class="card-num">${total.toLocaleString('pt-BR')}</div>
      <div class="card-lbl">Total de Notas</div>
    </div>`;

  document.getElementById('cardEntregues').innerHTML = `
    <div class="card-stat card-verde">
      <div class="card-icon">✅</div>
      <div class="card-num">${entregue.toLocaleString('pt-BR')}</div>
      <div class="card-pct">${pctE}%</div>
      <div class="card-lbl">Entregues</div>
    </div>`;

  document.getElementById('cardProblemas').innerHTML = `
    <div class="card-stat card-vermelho">
      <div class="card-icon">⚠️</div>
      <div class="card-num">${(problema + naoEnc).toLocaleString('pt-BR')}</div>
      <div class="card-pct">${pctP}% problema</div>
      <div class="card-lbl">Com Ocorrência</div>
    </div>`;
}

// ============================================================
// GRÁFICO PIZZA
// ============================================================

function renderizarGraficoPizza(dados) {
  const entregue = parseInt(dados.notas_entregues)       || 0;
  const problema = parseInt(dados.notas_problema)        || 0;
  const naoEnc   = parseInt(dados.notas_nao_encontrado)  || 0;
  const pendente = parseInt(dados.notas_pendente)        || 0;

  const ctx = document.getElementById('graficoPizza').getContext('2d');

  if (graficoPizza) graficoPizza.destroy();

  graficoPizza = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Entregues', 'Problema', 'Não Encontrado', 'Pendente'],
      datasets: [{
        data: [entregue, problema, naoEnc, pendente],
        backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#475569'],
        borderColor: '#0a0f1f',
        borderWidth: 3,
        hoverOffset: 12
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#e0e7ff', padding: 20, font: { size: 13, weight: '600' } }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return ` ${ctx.label}: ${ctx.parsed.toLocaleString('pt-BR')} (${pct}%)`;
            }
          }
        }
      },
      cutout: '60%'
    }
  });
}

// ============================================================
// GRÁFICO BARRAS
// ============================================================

function renderizarGraficoBarras(lista, modo) {
  const labels    = lista.map(r => formatarDataLabel(r.data, modo));
  const entregues = lista.map(r => parseInt(r.notas_entregues)      || 0);
  const problemas = lista.map(r => parseInt(r.notas_problema)        || 0);
  const naoEnc    = lista.map(r => parseInt(r.notas_nao_encontrado)  || 0);
  const pendentes = lista.map(r => parseInt(r.notas_pendente)        || 0);

  const ctx = document.getElementById('graficoBarras').getContext('2d');

  if (graficoBarras) graficoBarras.destroy();

  graficoBarras = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Entregues',
          data: entregues,
          backgroundColor: 'rgba(16,185,129,0.85)',
          borderRadius: 4
        },
        {
          label: 'Problema',
          data: problemas,
          backgroundColor: 'rgba(239,68,68,0.85)',
          borderRadius: 4
        },
        {
          label: 'Não Encontrado',
          data: naoEnc,
          backgroundColor: 'rgba(245,158,11,0.85)',
          borderRadius: 4
        },
        {
          label: 'Pendente',
          data: pendentes,
          backgroundColor: 'rgba(71,85,105,0.85)',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          ticks: { color: '#94a3b8', font: { size: 12 } },
          grid: { color: 'rgba(37,99,235,0.08)' }
        },
        y: {
          stacked: true,
          ticks: { color: '#94a3b8', font: { size: 12 } },
          grid: { color: 'rgba(37,99,235,0.12)' }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#e0e7ff', padding: 16, font: { size: 12, weight: '600' } }
        }
      }
    }
  });
}

// ============================================================
// TABELA DETALHADA
// ============================================================

function renderizarTabela(lista, modo) {
  const tbody = document.getElementById('tabelaEstatisticas');
  tbody.innerHTML = '';

  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#94a3b8;">Sem dados para o período.</td></tr>';
    return;
  }

  lista.forEach(row => {
    const total    = parseInt(row.total_notas)          || 0;
    const entregue = parseInt(row.notas_entregues)      || 0;
    const problema = parseInt(row.notas_problema)       || 0;
    const naoEnc   = parseInt(row.notas_nao_encontrado) || 0;
    const pendente = parseInt(row.notas_pendente)       || 0;
    const pct = total > 0 ? ((entregue / total) * 100).toFixed(1) : '0.0';

    const dataExibir = row.data
      ? new Date(row.data + 'T12:00:00').toLocaleDateString('pt-BR')
      : '—';

    const pctNum = parseFloat(pct);
    const pctCor = pctNum >= 90 ? '#10b981' : pctNum >= 70 ? '#f59e0b' : '#ef4444';

    tbody.innerHTML += `
      <tr>
        <td>${dataExibir}</td>
        <td>${parseInt(row.total_carregamentos) || 0}</td>
        <td>${total.toLocaleString('pt-BR')}</td>
        <td style="color:#10b981;font-weight:700;">${entregue.toLocaleString('pt-BR')}</td>
        <td style="color:#ef4444;">${problema.toLocaleString('pt-BR')}</td>
        <td style="color:#f59e0b;">${naoEnc.toLocaleString('pt-BR')}</td>
        <td>
          <span style="font-weight:800;color:${pctCor};">${pct}%</span>
          <div style="height:4px;background:#1e293b;border-radius:4px;margin-top:4px;">
            <div style="height:100%;width:${pct}%;background:${pctCor};border-radius:4px;"></div>
          </div>
        </td>
      </tr>
    `;
  });
}

// ============================================================
// DOWNLOADS
// ============================================================

function downloadPNG() {
  const canvas = document.getElementById('graficoPizza');
  const link = document.createElement('a');
  link.download = `estatisticas_${new Date().toISOString().split('T')[0]}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function downloadCSV() {
  if (!dadosAtuais) { alert('Carregue algum dado antes de exportar.'); return; }

  const linhas = [['Data', 'Carregamentos', 'Total Notas', 'Entregues', 'Problema', 'Não Encontrado', 'Pendente', '% Entrega']];

  const lista = Array.isArray(dadosAtuais)
    ? dadosAtuais
    : (dadosAtuais.diarios || [dadosAtuais.resumo || dadosAtuais]);

  lista.forEach(row => {
    const total = parseInt(row.total_notas) || 0;
    const ent   = parseInt(row.notas_entregues) || 0;
    const pct   = total > 0 ? ((ent / total) * 100).toFixed(2) : '0.00';
    linhas.push([
      row.data || new Date().toISOString().split('T')[0],
      parseInt(row.total_carregamentos) || 0,
      total,
      ent,
      parseInt(row.notas_problema)        || 0,
      parseInt(row.notas_nao_encontrado)  || 0,
      parseInt(row.notas_pendente)        || 0,
      pct + '%'
    ]);
  });

  const csv = linhas.map(l => l.join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `estatisticas_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// UTILS
// ============================================================

function formatarDataLabel(data, modo) {
  if (!data) return '—';
  const d = new Date(data + 'T12:00:00');
  if (modo === 'semana') return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  if (modo === 'mes')    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return d.toLocaleDateString('pt-BR');
}

function mostrarErro(msg) {
  const el = document.getElementById('mensagemErro');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ============================================================
// CONTROLES DE FILTRO
// ============================================================

function selecionarHoje() {
  definirAbaBotoes('hoje');
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('inputData').value = hoje;
  carregarEstatisticasDia(hoje);
}

function selecionarSemana() {
  definirAbaBotoes('semana');
  carregarEstatisticasSemana();
}

function selecionarMes() {
  definirAbaBotoes('mes');
  const sel = document.getElementById('selMes');
  const [ano, mes] = sel.value.split('-');
  carregarEstatisticasMes(mes, ano);
}

function definirAbaBotoes(aba) {
  ['btnHoje', 'btnSemana', 'btnMes'].forEach(id => {
    document.getElementById(id).classList.remove('ativo');
  });
  document.getElementById('btn' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('ativo');
}

// ============================================================
// INIT
// ============================================================

(function init() {
  // Preenche select de mês com os últimos 12 meses
  const sel = document.getElementById('selMes');
  const agora = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const lbl = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = lbl.charAt(0).toUpperCase() + lbl.slice(1);
    if (i === 0) opt.selected = true;
    sel.appendChild(opt);
  }

  // Carrega hoje por padrão
  selecionarHoje();
}());
