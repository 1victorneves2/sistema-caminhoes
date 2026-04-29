function atualizarDashboard() {
  Promise.all([
    fetch('/api/caminhoes').then(r => r.json()),
    fetch('/api/viagens').then(r => r.json())
  ]).then(([caminhoes, viagens]) => {
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