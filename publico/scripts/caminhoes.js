function carregarCaminhoes() {
    fetch('/api/caminhoes')
        .then(response => response.json())
        .then(caminhoes => {
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

        fetch('/api/caminhoes', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ placa, tipo })
        })
        .then(res => res.json())
        .then(data => {
            if (data.erro) {
                alert(data.erro);
                return;
            }
            alert('Caminhão cadastrado com sucesso!');
            document.getElementById('placa').value = '';
            document.getElementById('tipo').value = '';
            carregarCaminhoes();
        }) 
    }

    carregarCaminhoes();