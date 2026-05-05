window.NAVBARS = {
  admin: [
    { label: 'Dashboard',     href: 'index.html' },
    { label: 'Caminhões',     href: 'caminhoes.html' },
    { label: 'Carregamentos', href: 'carregamentos.html' },
    { label: 'Funcionários',  href: 'funcionarios.html' },
    { label: 'Estatísticas',  href: 'estatisticas.html' },
    { label: 'Mapa GPS',      href: 'mapa.html' },
    { label: 'Histórico',     href: 'historico.html' },
    { label: 'Financeiro',    href: 'admin.html' },
    { label: 'Usuários',      href: 'admin-usuarios.html' }
  ],

  operador: [
    { label: 'Dashboard',     href: 'operador-dashboard.html' },
    { label: 'Carregamentos', href: 'carregamentos.html' },
    { label: 'Funcionários',  href: 'funcionarios.html' },
    { label: 'Estatísticas',  href: 'estatisticas.html' },
    { label: 'Mapa GPS',      href: 'mapa.html' }
  ],

  motorista: [
    { label: 'Minhas Entregas', href: 'motorista-entregas.html' },
    { label: 'Meu Perfil',      href: 'motorista-perfil.html' }
  ],

  // fallback para roles não mapeadas
  user: [
    { label: 'Dashboard', href: 'index.html' }
  ]
};
