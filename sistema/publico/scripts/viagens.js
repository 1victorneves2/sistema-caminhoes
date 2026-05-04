// viagens.js — redireciona para a API de carregamentos
// A tabela "viagens" foi renomeada para "carregamentos".
// Este arquivo mantém compatibilidade com qualquer código que ainda importe viagens.js.

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

function carregarCarregamentos() {
  fetchComToken('/api/carregamentos')
    .then(r => r && r.json())
    .then(data => {
      if (!data) return;
      const lista = data.dados || [];
      const tbody = document.getElementById('listaViagens') || document.getElementById('tabelaViagens');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#94a3b8;">Nenhum carregamento registrado.</td></tr>';
        return;
      }

      lista.forEach(c => {
        const statusBg = {
          carregado: 'background:rgba(245,158,11,0.2);color:#fbbf24;',
          em_rota:   'background:rgba(37,99,235,0.2);color:#60a5fa;',
          entregue:  'background:rgba(16,185,129,0.2);color:#10b981;',
          concluido: 'background:rgba(100,116,139,0.2);color:#94a3b8;'
        }[c.status] || '';

        tbody.innerHTML += `
          <tr style="border-top:1px solid rgba(37,99,235,0.1);">
            <td style="padding:1.25rem;color:#e0e7ff;">${c.id}</td>
            <td style="padding:1.25rem;color:#e0e7ff;">${c.placa || '—'}</td>
            <td style="padding:1.25rem;color:#e0e7ff;">${c.motorista_nome || '—'}</td>
            <td style="padding:1.25rem;color:#e0e7ff;">${c.conferente_nome || '—'}</td>
            <td style="padding:1.25rem;"><span class="status-badge" style="${statusBg}">${c.status.replace(/_/g,' ').toUpperCase()}</span></td>
            <td style="padding:1.25rem;color:#e0e7ff;">${c.data_saida ? c.data_saida.substring(0,10) : '—'}</td>
            <td style="padding:1.25rem;"></td>
          </tr>`;
      });
    });
}

// Alias para código legado que ainda chama carregarViagens()
const carregarViagens = carregarCarregamentos;

carregarCarregamentos();
