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

function carregarCaminhoes() {
  fetchComToken('/api/caminhoes')
    .then(response => response && response.json())
    .then(caminhoes => {
      if (!caminhoes) return;
      const tbody = document.getElementById('listaCaminhoes');
      tbody.innerHTML = '';

      caminhoes.forEach(c => {
        tbody.innerHTML += `
          <tr>
            <td>${c.id}</td>
            <td>${c.placa}</td>
            <td>${c.tipo}</td>
            <td>${c.status}</td>
          </tr>
        `;
      });
    });
}

function cadastrarCaminhao() {
  const placa = document.getElementById('placa').value;
  const tipo = document.getElementById('tipo').value;

  if (!placa || !tipo) {
    alert('Preencha a placa e o tipo do caminhão.');
    return;
  }

  fetchComToken('/api/caminhoes', {
    method: 'POST',
    body: JSON.stringify({ placa, tipo })
  })
  .then(res => res && res.json())
  .then(data => {
    if (!data) return;
    if (data.erro) {
      alert(data.erro);
      return;
    }
    alert('Caminhão cadastrado com sucesso!');
    document.getElementById('placa').value = '';
    document.getElementById('tipo').value = '';
    carregarCaminhoes();
  });
}

carregarCaminhoes();
