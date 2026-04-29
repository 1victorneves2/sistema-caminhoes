# 🚚 Sistema de Controle de Caminhões e Entregas

Sistema completo de gerenciamento de caminhões, motoristas, funcionários e viagens.

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL 12+
- npm ou yarn

## 🚀 Setup Inicial

### 1. Clonar o repositório e instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais do PostgreSQL:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/sistema_caminhoes
JWT_SECRET=sua-chave-secreta-muito-segura-aqui
```

### 3. Criar banco de dados PostgreSQL

```sql
CREATE DATABASE sistema_caminhoes;
```

### 4. Executar script de setup do banco de dados

```bash
node banco/setup.js
```

Isso criará todas as tabelas necessárias.

### 5. Criar usuário admin inicial

```bash
node banco/criar-admin.js
```

Ou via API:

```bash
curl -X POST http://localhost:3000/api/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "senha": "senha123",
    "nome": "Administrador",
    "role": "admin"
  }'
```

### 6. Iniciar o servidor

```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`

## 📚 Documentação da API

### Autenticação

#### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "senha": "senha123"
}
```

Resposta:

```json
{
  "sucesso": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": 1,
    "nome": "Administrador",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### Caminhões

#### Listar caminhões

```bash
GET /api/caminhoes
Authorization: Bearer {token}
```

#### Criar caminhão (admin apenas)

```bash
POST /api/caminhoes
Authorization: Bearer {token}
Content-Type: application/json

{
  "placa": "ABC-1234",
  "tipo": "truck"
}
```

#### Atualizar caminhão (admin apenas)

```bash
PUT /api/caminhoes/1
Authorization: Bearer {token}
Content-Type: application/json

{
  "placa": "ABC-1234",
  "tipo": "toco"
}
```

#### Deletar caminhão (soft delete, admin apenas)

```bash
DELETE /api/caminhoes/1
Authorization: Bearer {token}
```

### Motoristas

#### Listar motoristas

```bash
GET /api/motoristas
Authorization: Bearer {token}
```

#### Criar motorista (admin apenas)

```bash
POST /api/motoristas
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "João Silva",
  "cpf": "123.456.789-00",
  "contato": "11987654321"
}
```

### Viagens

#### Listar viagens

```bash
GET /api/viagens
Authorization: Bearer {token}
```

#### Criar viagem (admin apenas)

```bash
POST /api/viagens
Authorization: Bearer {token}
Content-Type: application/json

{
  "caminhao_id": 1,
  "motorista_id": 1,
  "funcionario_id": 1,
  "rota": "São Paulo - Rio de Janeiro",
  "mercadoria": "Eletrônicos",
  "nota_fiscal": "NF-001"
}
```

#### Atualizar status viagem (admin apenas)

```bash
PUT /api/viagens/1
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "entregue"
}
```

Ou com problema:

```json
{
  "status": "retorno_problema",
  "motivo_retorno": "cliente_ausente",
  "observacoes_retorno": "Cliente não compareceu"
}
```

## 🔐 Segurança

- ✅ Autenticação JWT com expiração de 24h
- ✅ Senhas criptografadas com bcrypt
- ✅ Validação de autorização (apenas admins podem modificar dados)
- ✅ Validação de entrada (prevents SQL injection)
- ✅ WebSocket autenticado
- ✅ Soft delete (dados não são apagados fisicamente)

## 📁 Estrutura do Projeto

```
sistema-caminhoes/
├── banco/
│   └── setup.js                 # Script de criação de tabelas
├── middlewares/
│   └── auth.js                  # Middleware de autenticação JWT
├── rotas/
│   ├── caminhoes.js             # Rotas de caminhões
│   ├── motoristas.js            # Rotas de motoristas
│   ├── funcionarios.js          # Rotas de funcionários
│   ├── viagens.js               # Rotas de viagens
│   ├── rotas_auth.js            # Rotas de autenticação
│   └── rotas_admin.js           # Rotas administrativas
├── publico/
│   ├── index.html               # Dashboard
│   ├── admin.html               # Painel administrativo
│   ├── login.html               # Página de login
│   └── scripts/
│       ├── viagens.js           # Scripts de viagens
│       ├── caminhoes.js         # Scripts de caminhões
│       └── ...
├── server.js                    # Servidor Express
├── websocket.js                 # Configuração WebSocket
├── package.json                 # Dependências
└── .env                         # Variáveis de ambiente
```

## 🐛 Troubleshooting

### Erro: "Banco de dados não conectado"

- Verifique se o PostgreSQL está rodando
- Confira a `DATABASE_URL` no arquivo `.env`
- Verifique se o banco de dados foi criado

### Erro: "Token inválido"

- Verifique se o token está sendo enviado no header `Authorization: Bearer {token}`
- Confira se o token não expirou (validade de 24h)
- Tente fazer login novamente

### Erro: "Acesso negado"

- Apenas admins podem criar/editar/deletar dados
- Use uma conta com `role: admin`

## 📝 Notas de Desenvolvimento

- Todos os endpoints exigem autenticação JWT
- Endpoints de modificação exigem `role: admin`
- Soft delete: dados são marcados como `ativo: false`
- WebSocket requer token na query string: `ws://localhost:3000?token={token}`

## 📄 Licença

MIT
