/**
 * fetchComToken — helper central para chamadas autenticadas.
 * Carregado em todas as páginas que precisam da API.
 */
async function fetchComToken(url, options = {}) {
  const token = localStorage.getItem('token');

  console.log('[auth] fetchComToken:', url, '| token:', !!token);

  if (!token) {
    console.error('[auth] Nenhum token no localStorage — redirecionando para login');
    window.location.href = '/login.html';
    return null;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  try {
    const response = await fetch(url, { ...options, headers });

    console.log('[auth] Response status:', response.status, url);

    if (response.status === 401) {
      console.error('[auth] Token expirado ou inválido — limpando sessão');
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      localStorage.removeItem('empresa_id');
      localStorage.removeItem('permissoes');
      document.cookie = 'token=; path=/; max-age=0';
      alert('Sessão expirada. Faça login novamente.');
      window.location.href = '/login.html';
      return null;
    }

    return response;
  } catch (err) {
    console.error('[auth] Erro de rede em fetchComToken:', err);
    return null;
  }
}
