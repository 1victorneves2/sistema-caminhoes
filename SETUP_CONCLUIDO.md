# Setup Concluído

## Status

Servidor iniciando corretamente na porta 3000.

```
✅ Mock SQLite conectado (sem banco real)
🚀 Servidor rodando na porta 3000
📍 Acesse: http://localhost:3000
```

## O que foi feito

### Reorganização de arquivos

| Arquivo | Origem | Destino |
|---------|--------|---------|
| rotas_auth.js | `rotas/rotas_auth.js` | `routes/rotas_auth.js` |
| rotas_admin.js | `rotas/rotas_admin.js` | `routes/rotas_admin.js` |

Os arquivos em `controllers/`, `models/`, `banco/` e `publico/` já estavam nas pastas corretas.

### server.js

- Import de auth: `./routes/auth` → `./routes/rotas_auth`
- Import de admin: `./rotas/rotas_admin` → `./routes/rotas_admin`
- Pool de banco condicional: usa mock quando `DATABASE_URL` começa com `sqlite:`, senão inicializa `pg.Pool`

### .env (`sistema/.env`)

```
DATABASE_URL=sqlite:banco.db   ← modo mock (sem PostgreSQL real)
JWT_SECRET=8bb580690ef3d59...  ← 64 chars hex
PORT=3000
NODE_ENV=development
```

### package.json

- Removido `bcrypt` (nativo, requeria compilação)
- Mantido apenas `bcryptjs` (pure JS, sem dependências nativas)

## Como rodar

```bash
cd sistema
npm start
# → http://localhost:3000
```

## Para usar com PostgreSQL real

Altere `sistema/.env`:

```
DATABASE_URL=postgresql://usuario:senha@host:5432/sistema_caminhoes
```

O servidor detecta automaticamente e usa `pg.Pool` em vez do mock.
