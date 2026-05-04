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
      window.location.href = '/login.html';
      return null;
    }
    return response;
  });
}

function atualizarDashboard() {
  Promise.all([
    fetchComToken('/api/caminhoes').then(r => r && r.json()),
    fetchComToken('/api/viagens').then(r => r && r.json())
  ]).then(([caminhoes, viagens]) => {
    if (!caminhoes || !viagens) return;

    const disponveis = caminhoes.filter(c => c.status === 'disponivel').length;
    const emRota = viagens.filter(v => v.status === 'saiu_para_entrega').length;
    const entregues = viagens.filter(v => v.status === 'entregue').length;
    const problema = viagens.filter(v => v.status === 'retorno_problema').length;

    document.getElementById('disponveis').textContent = disponveis;
    document.getElementById('em-rota').textContent = emRota;
    document.getElementById('entregues').textContent = entregues;
    document.getElementById('problema').textContent = problema;

    carregarViagensTabela(viagens);
  });
}

function carregarViagensTabela(viagens) {
  const tbody = document.getElementById('viagensTabela');
  tbody.innerHTML = '';

  viagens.filter(v => v.status !== 'entregue').forEach(v => {
    tbody.innerHTML += `
      <tr>
        <td>${v.id}</td>
        <td>${v.placa}</td>
        <td>${v.motorista}</td>
        <td>${v.rota}</td>
        <td><span class="status-badge status-${v.status}">${v.status}</span></td>
        <td>${v.data_saida}</td>
      </tr>
    `;
  });
}

atualizarDashboard();
setInterval(atualizarDashboard, 10000);
