# Refactoring Completo

## O que foi mudado

### TAREFA 1 — Histórico

| Arquivo | Mudança |
|---------|---------|
| `publico/historico.html` | Opções do select corrigidas para nomes de tabela reais (`viagens`, `caminhoes`, `motoristas`, `funcionarios`) |
| `publico/historico.html` | Parâmetro da API corrigido: `tipo` → `tabela` (estava enviando valor errado ao backend) |
| `publico/historico.html` | Histórico carrega automaticamente ao abrir a página (7 dias passados → hoje) |
| `publico/historico.html` | Link "Motoristas" removido do menu de navegação |

### TAREFA 2 — Unificação Motoristas / Funcionários

#### Frontend removido
- `publico/motoristas.html` — **deletado**
- `publico/scripts/motoristas.js` — **deletado**
- Link "Motoristas" removido de `caminhoes.html` e `historico.html`

#### admin.html
- Aba "Motoristas" removida do painel
- Modal "Motorista" removido (e todas as funções JS associadas)
- Campo "Função" do modal Funcionário agora é um `<select>` com opções predefinidas: Motorista, Conferente, Carregador, Administrativo, Gerente
- Select "Motorista" na criação de viagem agora busca de `/api/funcionarios?funcao=Motorista`
- Select "Funcionário" na criação de viagem exclui os de funcao=Motorista (evita duplicidade)
- Tabela de Funcionários agora tem filtro por tipo e exibe badge colorido de função
- `carregarFuncionarios()` respeita o filtro `filtroFuncao`

#### viagens.html
- Select "Motorista" agora busca de `/api/funcionarios?funcao=Motorista`
- Select "Funcionário" exclui registros com funcao=Motorista

#### Backend

| Arquivo | Mudança |
|---------|---------|
| `models/funcionario.js` | `listar(funcao)` aceita parâmetro opcional para filtrar por funcao |
| `controllers/funcionarioController.js` | `listar` suporta query param `?funcao=` |
| `models/viagem.js` | `SELECT_VIAGEM` usa `COALESCE(m_fun.nome, m_leg.nome) AS motorista` — compatível com viagens pré e pós-migração |
| `models/viagem.js` | `verificarMotorista` busca primeiro em `funcionarios`, depois em `motoristas` como fallback |

#### Migração de dados
- `banco/migrar-motoristas.js` — script de migração criado

---

## Como executar a migração

```bash
cd sistema
node banco/migrar-motoristas.js
```

O script faz (dentro de uma transação, com ROLLBACK automático em caso de erro):
1. Copia todos os motoristas para `funcionarios` com `funcao = 'Motorista'`
2. Remove a constraint FK `viagens_motorista_id_fkey` (que apontava para `motoristas`)
3. Atualiza `viagens.motorista_id` para apontar aos novos IDs em `funcionarios`
4. Adiciona nova FK `viagens.motorista_id → funcionarios(id)`

**Fazer backup antes de rodar:**
```bash
pg_dump $DATABASE_URL > backup_pre_migracao.sql
```

---

## Como testar após a migração

```bash
# 1. Histórico com filtro por tabela
GET /api/admin/historico?tabela=viagens&dataInicio=2024-01-01&dataFim=2024-12-31
# Esperado: lista de operações em viagens

# 2. Listar motoristas (agora são funcionarios)
GET /api/funcionarios?funcao=Motorista
# Esperado: lista de funcionarios com funcao='Motorista'

# 3. Listar todos os funcionários com filtro
GET /api/funcionarios?funcao=Conferente
# Esperado: lista de conferentes

# 4. Criar viagem com motorista vindo de funcionarios
# - Abrir viagens.html ou admin.html
# - Modal "Criar Viagem": select Motorista deve mostrar funcionarios tipo=Motorista
# - Criar viagem → deve salvar com sucesso

# 5. Verificar viagens existentes ainda mostram motorista
GET /api/viagens
# Esperado: campo "motorista" preenchido (via COALESCE)
```

---

## Próximas etapas

- [ ] Verificar se há referências a `motoristas.html` em outros lugares (emails, bookmarks, etc.)
- [ ] Adicionar campo `contato` ao modelo de funcionário (atualmente só está em motoristas)
- [ ] Considerar deprecar a tabela `motoristas` após confirmar estabilidade
- [ ] Rate limiting em `/api/auth/login`
- [ ] Header de segurança com `helmet`
