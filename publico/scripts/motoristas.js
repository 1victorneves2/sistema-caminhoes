function carregarMotoristas() {
  fetch('/api/motoristas')
    .then(res => res.json())
    .then(motoristas => {
      const tbody = document.getElementById('listaMotoristas');
      tbody.innerHTML = '';
      
      motoristas.forEach(m => {
        tbody.innerHTML += `
          <tr>
            <td>${m.id}</td>
            <td>${m.nome}</td>
            <td>${m.cpf}</td>
            <td>${m.contato || '-'}</td>
          </tr>
        `;
      });
    });
}

function cadastrarMotorista() {
  const nome = document.getElementById('nome').value;
  const cpf = document.getElementById('cpf').value;
  const contato = document.getElementById('contato').value;

  if (!nome || !cpf) {
    alert('Nome e CPF são obrigatórios!');
    return;
  }

  fetch('/api/motoristas', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ nome, cpf, contato })
  })
  .then(res => res.json())
  .then(data => {
    if (data.erro) {
      alert(data.erro);
      return;
    }
    alert('Motorista cadastrado com sucesso!');
    document.getElementById('nome').value = '';
    document.getElementById('cpf').value = '';
    document.getElementById('contato').value = '';
    carregarMotoristas();
  });
}

carregarMotoristas();