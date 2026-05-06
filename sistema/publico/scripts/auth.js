async function fetchComToken(url, options = {}) {
  const token = localStorage.getItem('token');

  console.log('[fetchComToken] URL:', url);
  console.log('[fetchComToken] Token existe:', !!token);

  if (!token) {
    console.error('[fetchComToken] Token não encontrado. Redirecionando para login...');
    alert('Sessão expirada. Faça login novamente.');
    localStorage.clear();
    window.location.href = '/login.html';
    return null;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  console.log('[fetchComToken] Headers:', {
    'Content-Type': headers['Content-Type'],
    'Authorization': 'Bearer ' + token.substring(0, 20) + '...'
  });

  try {
    const response = await fetch(url, { ...options, headers });

    console.log('[fetchComToken] Response status:', response.status, url);

    if (response.status === 401) {
      console.error('[fetchComToken] 401 - Token inválido ou expirado');
      localStorage.clear();
      document.cookie = 'token=; path=/; max-age=0';
      alert('Sessão expirada. Faça login novamente.');
      window.location.href = '/login.html';
      return null;
    }

    if (!response.ok) {
      console.error('[fetchComToken] Erro:', response.status, response.statusText);
    }

    return response;
  } catch (err) {
    console.error('[fetchComToken] Erro na requisição:', err);
    return null;
  }
}
