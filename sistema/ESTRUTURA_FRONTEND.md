# Estrutura do Frontend

## Organização de pastas

```
publico/
├── login.html                          # Página de login (pública)
├── bem-vindo.html                      # Pós-login: detecta role e redireciona (pública)
│
├── admin/
│   ├── admin-dashboard.html            # Dashboard de operações em tempo real (admin)
│   ├── admin-financeiro.html           # Painel completo: Caminhões, Funcionários, Viagens, Financeiro (admin)
│   └── admin-usuarios.html            # Gerenciar usuários e roles (admin)
│
├── operador/
│   ├── operador-dashboard.html         # Dashboard do operador com acesso rápido
│   └── carregamentos.html             # Gestão de carregamentos e notas fiscais
│
├── motorista/
│   ├── motorista-entregas.html        # Interface mobile de entregas do motorista
│   └── motorista-perfil.html         # Perfil e estatísticas do motorista
│
├── compartilhado/
│   ├── estatisticas.html             # Gráficos e relatórios de entregas
│   ├── mapa.html                     # Mapa GPS com rastreamento em tempo real (Leaflet.js + WebSocket)
│   └── historico.html               # Log de operações com filtros por data
│
└── scripts/
    ├── config-navbar.js              # Configuração dos menus por role (window.NAVBARS)
    ├── navbar.js                     # Renderização da navbar dinâmica
    ├── carregamentos.js              # Lógica de carregamentos (carregada por operador/carregamentos.html)
    ├── estatisticas.js               # Lógica de gráficos (carregada por compartilhado/estatisticas.html)
    ├── admin-usuarios.js             # Lógica de usuários (carregada por admin/admin-usuarios.html)
    └── dashboard.js                  # Scripts do dashboard admin
```

## Fluxo de navegação

```
/  (raiz)
├── sem cookie de sessão → /login.html
└── com cookie de sessão → /bem-vindo.html
                               ├── role=admin     → /admin/admin-dashboard.html
                               ├── role=operador  → /operador/operador-dashboard.html
                               └── role=motorista → /motorista/motorista-entregas.html
```

## Navbar dinâmica

A navbar é configurada em `scripts/config-navbar.js` via `window.NAVBARS`:

| Role      | Links disponíveis                                                                     |
|-----------|---------------------------------------------------------------------------------------|
| admin     | Dashboard, Painel Admin, Carregamentos, Estatísticas, Mapa GPS, Histórico, Usuários  |
| operador  | Dashboard, Carregamentos, Estatísticas, Mapa GPS                                     |
| motorista | Minhas Entregas, Meu Perfil                                                          |

Cada página incluí:
```html
<script src="/scripts/config-navbar.js"></script>
<script src="/scripts/navbar.js"></script>
<script>renderizarNavbar();</script>
```

## Páginas de compatibilidade (redirects)

Os arquivos antigos na raiz de `publico/` foram convertidos em redirects instantâneos:

| URL antiga              | Redireciona para                        |
|-------------------------|-----------------------------------------|
| /index.html             | /admin/admin-dashboard.html             |
| /admin.html             | /admin/admin-financeiro.html            |
| /admin-dashboard.html   | /admin/admin-dashboard.html             |
| /admin-usuarios.html    | /admin/admin-usuarios.html              |
| /operador-dashboard.html| /operador/operador-dashboard.html       |
| /carregamentos.html     | /operador/carregamentos.html            |
| /motorista-entregas.html| /motorista/motorista-entregas.html      |
| /entrega.html           | /motorista/motorista-entregas.html      |
| /caminhoes.html         | /admin/admin-financeiro.html            |
| /viagens.html           | /admin/admin-financeiro.html            |
| /estatisticas.html      | /compartilhado/estatisticas.html        |
| /mapa.html              | /compartilhado/mapa.html                |
| /historico.html         | /compartilhado/historico.html           |

## Convenções

- **Caminhos absolutos**: todos os links usam `/caminho` (nunca relativos como `../`)
- **Auth guard**: cada página verifica `localStorage.getItem('token')` e redireciona para `/login.html` se ausente
- **Proteção server-side**: `server.js` redireciona para `/login.html` se não houver cookie `token`
- **Logout**: `window.logout()` exposto globalmente por `navbar.js`; limpa localStorage e cookie
- **API**: todas as chamadas usam `/api/...` (absoluto) com header `Authorization: Bearer <token>`
