/**
 * Renderiza a navbar baseado no role do usuário logado.
 * Requer /scripts/config-navbar.js carregado antes deste script.
 */
function renderizarNavbar() {
  const token   = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  const role = usuario.role || 'user';
  const itens = (window.NAVBARS && window.NAVBARS[role]) || window.NAVBARS.user || [];

  const paginaAtual = window.location.pathname;

  const linksHTML = itens.map(item => {
    const ativo = paginaAtual === item.href ? ' class="ativo"' : '';
    return `<a href="${item.href}"${ativo}>${item.label}</a>`;
  }).join('\n      ');

  const nav = document.querySelector('nav');
  if (!nav) return;

  nav.innerHTML = `
    <h1>Controle de Caminhões</h1>
    <div class="nav-links">
      ${linksHTML}
      <a href="#" id="linkSair">Sair</a>
    </div>
  `;

  document.getElementById('linkSair').addEventListener('click', function(e) {
    e.preventDefault();
    window.logout();
  });

  window.logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('empresa_id');
    localStorage.removeItem('permissoes');
    document.cookie = 'token=; path=/; max-age=0';
    window.location.href = '/login.html';
  };
}

function verificarPermissaoFrontend(modulo, acao) {
  try {
    const permissoes = JSON.parse(localStorage.getItem('permissoes') || '[]');
    if (!Array.isArray(permissoes)) return false;
    return permissoes.some(p => p.modulo === modulo && p.acao === acao);
  } catch {
    return false;
  }
}

function aplicarPermissoesFrontend() {
  document.querySelectorAll('[data-permissao]').forEach(el => {
    const [modulo, acao] = (el.dataset.permissao || '').split(':');
    if (modulo && acao && !verificarPermissaoFrontend(modulo, acao)) {
      el.style.display = 'none';
    }
  });
}
