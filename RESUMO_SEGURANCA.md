# Resumo de Segurança — sistema-caminhoes

## Vulnerabilidades Corrigidas

### 1. JWT sem segredo obrigatório (`middlewares/auth.js`)
**Problema:** O servidor iniciava mesmo sem `JWT_SECRET` definido, usando um fallback fixo `'sua-chave-secreta-aqui'`.  
**Correção:** Removido o fallback. O processo encerra imediatamente com `process.exit(1)` se `JWT_SECRET` não estiver definido.

### 2. Servidor iniciava sem variáveis críticas (`server.js`)
**Problema:** O servidor subia sem validar `JWT_SECRET` e `DATABASE_URL`.  
**Correção:** Validação explícita no topo de `server.js` — servidor não sobe sem essas variáveis.

### 3. Rotas de viagens sem verificação de admin (`routes/viagens.js`)
**Problema:** `POST /api/viagens` e `PUT /api/viagens/:id` aceitavam qualquer usuário autenticado.  
**Correção:** Adicionado middleware `verificarAdmin` em ambas as rotas.

### 4. Falta de validação de input em endpoints admin (`rotas/rotas_admin.js`)
**Problema:** Parâmetros `tabela`, `dataInicio`, `dataFim` e `status` eram aceitos sem validação.  
**Correção:**
- `tabela` validada contra whitelist: `['caminhoes', 'motoristas', 'viagens', 'funcionarios', 'usuarios']`
- `status` validada contra: `['carregado', 'saiu_para_entrega', 'em_rota', 'entregue', 'retorno_problema']`
- Datas validadas com regex `YYYY-MM-DD` e `new Date()` check
- Retorna HTTP 400 para valores inválidos

---

## O que já estava correto

- Queries com parameterized placeholders (`$1`, `$2`) em todos os models e rotas — sem SQL injection
- Senhas armazenadas com bcrypt (salt rounds 10) via `bcryptjs`
- JWT com expiração de 24h
- `verificarToken` + `verificarAdmin` aplicados em todas as rotas de escrita (caminhões, motoristas, funcionários)
- `.env` não versionado (`.gitignore` já inclui `.env`)
- `dotenv` carregado na primeira linha do `server.js`

---

## Como testar

```bash
# 1. Login com credenciais inválidas → 401
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"errado@test.com","senha":"errada"}'

# 2. Login válido → retorna token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sistema.com","senha":"admin123"}'

# 3. GET /api/caminhoes sem token → 401
curl http://localhost:3000/api/caminhoes

# 4. GET /api/caminhoes com token → 200
curl http://localhost:3000/api/caminhoes \
  -H "Authorization: Bearer <TOKEN>"

# 5. DELETE sem ser admin → 403
curl -X DELETE http://localhost:3000/api/caminhoes/1 \
  -H "Authorization: Bearer <TOKEN_USER>"

# 6. Tabela inválida no histórico → 400
curl "http://localhost:3000/api/admin/historico?tabela=usuarios_hack" \
  -H "Authorization: Bearer <TOKEN_ADMIN>"

# 7. Data inválida → 400
curl "http://localhost:3000/api/admin/historico?dataInicio=01/01/2024&dataFim=31/01/2024" \
  -H "Authorization: Bearer <TOKEN_ADMIN>"
```

---

## Próximas etapas de segurança recomendadas

1. **Rate limiting** — instalar `express-rate-limit` e limitar `/api/auth/login` (ex: 10 tentativas/15min)
2. **Helmet** — instalar `helmet` para headers HTTP de segurança
3. **CORS restritivo** — em produção, substituir `app.use(cors())` por `cors({ origin: process.env.CORS_ORIGIN })`
4. **Rotação de credenciais** — gerar novo `JWT_SECRET` e nova senha do banco após o acidente de exposição no `.env`
5. **Auditoria de registro** — a rota `POST /api/auth/registrar` permite qualquer um criar conta; adicionar `verificarAdmin` ou remover da API pública
