let caminhoes = [];
let motoristas = [];
let funcionarios = [];

function carregarDados() {
  Promise.all([
    fetch('/api/caminhoes').then(r => r.json()),
    fetch('/api/motoristas').then(r => r.json()),
    fetch('/api/funcionarios').then(r => r.json()),
    fetch('/api/viagens').then(r => r.json())
  ]).then(([c, m, f, v]) => {
    caminhoes = c;
    motoristas = m;
    funcionarios = f;
    
    preencherSelects();
    carregarViagens();
  });
}

function preencherSelects() {
  const selCaminhao = document.getElementById('caminhao');
  const selMotorista = document.getElementById('motorista');
  const selFuncionario = document.getElementById('funcionario');

  selCaminhao.innerHTML = '<option value="">Selecione o caminhão</option>';
  caminhoes.forEach(c => {
    if (c.status === 'disponivel') {
      selCaminhao.innerHTML += `<option value="${c.id}">${c.placa} - ${c.tipo}</option>`;
    }
  });

  selMotorista.innerHTML = '<option value="">Selecione o motorista</option>';
  motoristas.forEach(m => {
    selMotorista.innerHTML += `<option value="${m.id}">${m.nome}</option>`;
  });

  selFuncionario.innerHTML = '<option value="">Selecione o funcionário</option>';
  funcionarios.forEach(f => {
    selFuncionario.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
  });
}

function carregarViagens() {
  fetch('/api/viagens')
    .then(res => res.json())
    .then(viagens => {
      const tbody = document.getElementById('listaViagens');
      tbody.innerHTML = '';
      
      viagens.forEach(v => {
        let acoes = '';
        if (v.status === 'carregado') {
          acoes = `<button class="pequeno" onclick="marcarSaida(${v.id})">Saiu</button>`;
        } else if (v.status === 'saiu_para_entrega') {
          acoes = `
            <button class="pequeno" onclick="marcarEntregue(${v.id})">Entregue</button>
            <button class="pequeno" onclick="marcarProblema(${v.id})">Problema</button>
          `;
        }

        tbody.innerHTML += `
          <tr>
            <td>${v.id}</td>
            <td>${v.placa}</td>
            <td>${v.motorista}</td>
            <td>${v.rota}</td>
            <td><span class="status-badge status-${v.status}">${v.status}</span></td>
            <td>${acoes}</td>
          </tr>
        `;
      });
    });
}

function cadastrarViagem() {
  const caminhao_id = document.getElementById('caminhao').value;
  const motorista_id = document.getElementById('motorista').value;
  const funcionario_id = document.getElementById('funcionario').value;
  const rota = document.getElementById('rota').value;
  const mercadoria = document.getElementById('mercadoria').value;
  const nota_fiscal = document.getElementById('nota_fiscal').value;

  if (!caminhao_id || !motorista_id || !funcionario_id || !rota || !mercadoria || !nota_fiscal) {
    alert('Todos os campos são obrigatórios!');
    return;
  }

  fetch('/api/viagens', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ caminhao_id: parseInt(caminhao_id), motorista_id: parseInt(motorista_id), funcionario_id: parseInt(funcionario_id), rota, mercadoria, nota_fiscal })
  })
  .then(res => res.json())
  .then(data => {
    if (data.erro) {
      alert(data.erro);
      return;
    }
    alert('Viagem registrada com sucesso!');
    document.getElementById('caminhao').value = '';
    document.getElementById('motorista').value = '';
    document.getElementById('funcionario').value = '';
    document.getElementById('rota').value = '';
    document.getElementById('mercadoria').value = '';
    document.getElementById('nota_fiscal').value = '';
    carregarDados();
  });
}

function marcarSaida(id) {
  fetch(`/api/viagens/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ status: 'saiu_para_entrega' })
  })
  .then(res => res.json())
  .then(() => carregarViagens());
}

function marcarEntregue(id) {
  fetch(`/api/viagens/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ status: 'entregue' })
  })
  .then(res => res.json())
  .then(() => carregarViagens());
}

function marcarProblema(id) {
  const motivo = prompt('Qual o motivo do problema?');
  const conferente = prompt('Quem fez a conferência?');
  
  if (motivo && conferente) {
    fetch(`/api/viagens/${id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ 
        status: 'retorno_problema',
        motivo_retorno: motivo,
        conferente_retorno: conferente,
        observacoes_retorno: ''
      })
    })
    .then(res => res.json())
    .then(() => carregarViagens());
  }
}

carregarDados();