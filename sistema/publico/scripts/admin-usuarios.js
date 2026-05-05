/* ============================================================
   admin-usuarios.js — Gerenciamento de usuários e roles
   ============================================================ */

const _token = () => localStorage.getItem('token');
const _h = () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + _token() });

// ---- Notificação ----
function notif(msg, tipo = 'ok') {
  const el = document.getElementById('notificacao');
  el.textContent = msg;
  el.className = 'notificacao ' + (tipo === 'erro' ? 'notif-erro' : 'notif-ok');
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ---- Tabs ----
function abrirAba(nome) {
  document.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('ativa'));
  document.querySelectorAll('.aba-conteudo').forEach(c => c.classList.remove('ativa'));
  document.querySelector(`[data-aba="${nome}"]`).classList.add('ativa');
  document.getElementById('aba-' + nome).classList.add('ativa');

  if (nome === 'listar')  listarUsuarios();
  if (nome === 'roles')   listarRoles();
}

// ============================================================
// CRIAR USUÁRIO
// ============================================================
async function criarUsuario() {
  const email    = document.getElementById('novoEmail').value.trim();
  const nome     = document.getElementById('novoNome').value.trim();
  const senha    = document.getElementById('novaSenha').value;
  const role_id  = document.getElementById('novoRole').value;

  if (!email || !nome || !senha || !role_id) {
    notif('Preencha todos os campos', 'erro'); return;
  }
  if (senha.length < 6) {
    notif('Senha deve ter no mínimo 6 caracteres', 'erro'); return;
  }

  const btn = document.getElementById('btnCriar');
  btn.disabled = true; btn.textContent = 'Criando...';

  try {
    const r = await fetch('/api/usuarios', {
      method: 'POST', headers: _h(),
      body: JSON.stringify({ email, nome, senha, role_id: parseInt(role_id) })
    });
    const data = await r.json();
    if (!r.ok) { notif(data.erro || 'Erro ao criar', 'erro'); return; }

    notif(`✅ Usuário "${data.nome}" criado com sucesso!`);
    document.getElementById('formCriar').reset();
  } catch {
    notif('Erro de conexão', 'erro');
  } finally {
    btn.disabled = false; btn.textContent = 'Criar Usuário';
  }
}

// ============================================================
// LISTAR USUÁRIOS
// ============================================================
async function listarUsuarios() {
  const filtroRole = document.getElementById('filtroRole')?.value || '';
  const url = '/api/usuarios' + (filtroRole ? `?role=${filtroRole}` : '');

  document.getElementById('corpoTabela').innerHTML =
    '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#64748b;">Carregando...</td></tr>';

  try {
    const r = await fetch(url, { headers: _h() });
    const usuarios = await r.json();
    if (!r.ok) { notif(usuarios.erro || 'Erro', 'erro'); return; }
    renderizarTabelaUsuarios(usuarios);
  } catch {
    notif('Erro ao carregar usuários', 'erro');
  }
}

function renderizarTabelaUsuarios(usuarios) {
  const tbody = document.getElementById('corpoTabela');
  if (!usuarios.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#64748b;">Nenhum usuário encontrado</td></tr>';
    return;
  }

  const roleBadge = {
    admin:     'background:rgba(99,102,241,0.2);color:#818cf8;',
    operador:  'background:rgba(37,99,235,0.2);color:#60a5fa;',
    motorista: 'background:rgba(16,185,129,0.2);color:#10b981;',
  };

  tbody.innerHTML = usuarios.map(u => `
    <tr style="border-top:1px solid rgba(37,99,235,0.1);">
      <td style="padding:1rem;color:#64748b;font-size:12px;">#${u.id}</td>
      <td style="padding:1rem;color:#e0e7ff;">${u.email}</td>
      <td style="padding:1rem;color:#e0e7ff;">${u.nome}</td>
      <td style="padding:1rem;">
        <span style="${roleBadge[u.role] || 'background:rgba(100,116,139,0.2);color:#94a3b8;'}
          padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;">
          ${u.role_nome || u.role}
        </span>
      </td>
      <td style="padding:1rem;color:#64748b;font-size:12px;">${u.criado_em ? u.criado_em.substring(0,10) : '-'}</td>
      <td style="padding:1rem;">
        <button class="btn-acao btn-editar"     onclick="abrirModalEditar(${u.id},'${u.email}','${u.nome}',${u.role_id || 'null'})">Editar</button>
        <button class="btn-acao btn-permissoes" onclick="abrirModalPermissoes(${u.id},'${u.nome}')">Permissões</button>
        <button class="btn-acao btn-deletar"    onclick="confirmarDeletar(${u.id},'${u.nome}')">Deletar</button>
      </td>
    </tr>`).join('');
}

// ============================================================
// MODAL EDITAR USUÁRIO
// ============================================================
let _editandoId = null;

async function abrirModalEditar(id, email, nome, roleId) {
  _editandoId = id;
  document.getElementById('editEmail').value = email;
  document.getElementById('editNome').value  = nome;
  document.getElementById('editSenha').value = '';

  // Carregar roles no select
  await _preencherSelectRoles('editRole');
  if (roleId) document.getElementById('editRole').value = roleId;

  document.getElementById('modalEditar').classList.add('ativo');
}

async function salvarEdicao() {
  const nome    = document.getElementById('editNome').value.trim();
  const email   = document.getElementById('editEmail').value.trim();
  const senha   = document.getElementById('editSenha').value;
  const role_id = document.getElementById('editRole').value;

  const body = { nome, email };
  if (role_id) body.role_id = parseInt(role_id);
  if (senha)   body.senha   = senha;

  try {
    const r = await fetch(`/api/usuarios/${_editandoId}`, {
      method: 'PUT', headers: _h(), body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) { notif(data.erro || 'Erro ao editar', 'erro'); return; }
    notif('✅ Usuário atualizado!');
    fecharModal('modalEditar');
    listarUsuarios();
  } catch {
    notif('Erro de conexão', 'erro');
  }
}

// ============================================================
// MODAL EDITAR PERMISSÕES INDIVIDUAIS DO USUÁRIO
// ============================================================
let _permUsuarioId = null;
let _permIdsOriginais = [];   // IDs das permissões individuais antes de editar
let _permIdsRole = new Set(); // IDs das permissões herdadas da role (read-only)

async function abrirModalPermissoes(userId, nomeUsuario) {
  _permUsuarioId = userId;
  document.getElementById('tituloPermissoes').textContent = `Permissões — ${nomeUsuario}`;
  document.getElementById('listaPermissoes').innerHTML = '<p style="color:#64748b;">Carregando...</p>';
  document.getElementById('btnSalvarPermissoes').disabled = true;
  document.getElementById('modalPermissoes').classList.add('ativo');

  try {
    const [rUser, rTodas] = await Promise.all([
      fetch(`/api/usuarios/${userId}/permissoes`,  { headers: _h() }),
      fetch('/api/usuarios/permissoes/todas',       { headers: _h() })
    ]);

    if (!rUser.ok || !rTodas.ok) {
      document.getElementById('listaPermissoes').innerHTML = '<p style="color:#ef4444;">Erro ao carregar permissões</p>';
      return;
    }

    const dataUser  = await rUser.json();
    const dataTodas = await rTodas.json();

    _permIdsRole      = new Set((dataUser.permissoes || []).filter(p => p.tipo === 'role').map(p => p.id));
    _permIdsOriginais = (dataUser.permissoes_individuais || []).map(p => p.id);

    renderizarCheckboxesUsuario(dataTodas.permissoes, _permIdsRole, new Set(_permIdsOriginais));
    document.getElementById('btnSalvarPermissoes').disabled = false;
  } catch {
    document.getElementById('listaPermissoes').innerHTML = '<p style="color:#ef4444;">Erro ao carregar</p>';
  }
}

function renderizarCheckboxesUsuario(todasPermissoes, idsRole, idsIndividuais) {
  const grupos = {};
  todasPermissoes.forEach(p => {
    if (!grupos[p.modulo]) grupos[p.modulo] = [];
    grupos[p.modulo].push(p);
  });

  document.getElementById('listaPermissoes').innerHTML = Object.entries(grupos).map(([mod, perms]) => `
    <div class="perm-grupo">
      <div class="perm-modulo">
        ${mod.toUpperCase()}
        <button type="button" class="btn-mini" onclick="toggleGrupoUsuario('${mod}', true)">Todos</button>
        <button type="button" class="btn-mini" onclick="toggleGrupoUsuario('${mod}', false)">Nenhum</button>
      </div>
      ${perms.map(p => {
        const deRole    = idsRole.has(p.id);
        const deExtra   = idsIndividuais.has(p.id);
        const marcado   = deRole || deExtra;
        const badge     = deRole ? '<span class="badge-role">role</span>' : (deExtra ? '<span class="badge-extra">extra</span>' : '');
        return `
        <label class="checkbox-label" ${deRole ? 'title="Herdado da role — não pode ser removido aqui"' : ''}>
          <input type="checkbox" class="perm-usuario-check" data-id="${p.id}" data-modulo="${mod}"
            ${marcado ? 'checked' : ''} ${deRole ? 'disabled' : ''}>
          <span class="check-acao">${p.acao} ${badge}</span>
          <span class="check-desc">${p.descricao || ''}</span>
        </label>`;
      }).join('')}
    </div>`).join('');
}

function toggleGrupoUsuario(modulo, checked) {
  document.querySelectorAll(`.perm-usuario-check[data-modulo="${modulo}"]:not(:disabled)`)
    .forEach(cb => { cb.checked = checked; });
}

async function salvarPermissoesUsuario() {
  const btn = document.getElementById('btnSalvarPermissoes');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    const marcados    = Array.from(document.querySelectorAll('.perm-usuario-check:checked:not(:disabled)'))
                          .map(cb => parseInt(cb.dataset.id));
    const adicionadas = marcados.filter(id => !_permIdsOriginais.includes(id));
    const removidas   = _permIdsOriginais.filter(id => !marcados.includes(id));

    const erros = [];

    for (const perm_id of adicionadas) {
      const r = await fetch(`/api/usuarios/${_permUsuarioId}/permissoes`, {
        method: 'POST', headers: _h(),
        body: JSON.stringify({ permissao_id: perm_id })
      });
      if (!r.ok) erros.push(`add:${perm_id}`);
    }

    for (const perm_id of removidas) {
      const r = await fetch(`/api/usuarios/${_permUsuarioId}/permissoes/${perm_id}`, {
        method: 'DELETE', headers: _h()
      });
      if (!r.ok) erros.push(`del:${perm_id}`);
    }

    if (erros.length) {
      notif(`Salvo com ${erros.length} erro(s)`, 'erro');
    } else {
      notif(`✅ Permissões atualizadas (+${adicionadas.length} / -${removidas.length})`);
    }

    fecharModal('modalPermissoes');
  } catch {
    notif('Erro de conexão', 'erro');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar Permissões';
  }
}

// ============================================================
// DELETAR USUÁRIO
// ============================================================
async function confirmarDeletar(id, nome) {
  if (!confirm(`Deletar o usuário "${nome}"?\n\nEsta ação não pode ser desfeita.`)) return;

  try {
    const r = await fetch(`/api/usuarios/${id}`, { method: 'DELETE', headers: _h() });
    const data = await r.json();
    if (!r.ok) { notif(data.erro || 'Erro ao deletar', 'erro'); return; }
    notif(`✅ Usuário "${nome}" deletado`);
    listarUsuarios();
  } catch {
    notif('Erro de conexão', 'erro');
  }
}

// ============================================================
// ROLES
// ============================================================
async function listarRoles() {
  document.getElementById('corpoRoles').innerHTML =
    '<tr><td colspan="4" style="text-align:center;padding:2rem;color:#64748b;">Carregando...</td></tr>';

  try {
    const r = await fetch('/api/usuarios/roles', { headers: _h() });
    const roles = await r.json();
    if (!r.ok) { notif(roles.erro || 'Erro', 'erro'); return; }
    renderizarTabelaRoles(roles);
  } catch {
    notif('Erro ao carregar roles', 'erro');
  }
}

function renderizarTabelaRoles(roles) {
  const tbody = document.getElementById('corpoRoles');
  tbody.innerHTML = roles.map(r => `
    <tr style="border-top:1px solid rgba(37,99,235,0.1);">
      <td style="padding:1rem;color:#64748b;font-size:12px;">#${r.id}</td>
      <td style="padding:1rem;font-weight:700;color:#e0e7ff;text-transform:uppercase;">${r.nome}</td>
      <td style="padding:1rem;color:#94a3b8;font-size:13px;">${r.descricao || '-'}</td>
      <td style="padding:1rem;color:#60a5fa;">${r.total_permissoes}</td>
      <td style="padding:1rem;color:#94a3b8;">${r.total_usuarios}</td>
      <td style="padding:1rem;">
        <button class="btn-acao btn-permissoes" onclick="abrirModalEditarPermissoesRole(${r.id},'${r.nome}')">
          Editar Permissões
        </button>
      </td>
    </tr>`).join('');
}

// ============================================================
// MODAL EDITAR PERMISSÕES DE ROLE
// ============================================================
let _editandoRoleId = null;

async function abrirModalEditarPermissoesRole(roleId, roleNome) {
  _editandoRoleId = roleId;
  document.getElementById('tituloEditarRole').textContent = `Permissões da role: ${roleNome.toUpperCase()}`;
  document.getElementById('checkboxPermissoes').innerHTML = '<p style="color:#64748b;">Carregando...</p>';
  document.getElementById('modalEditarRole').classList.add('ativo');

  try {
    const r = await fetch(`/api/usuarios/roles/${roleId}/permissoes`, { headers: _h() });
    const data = await r.json();
    if (!r.ok) { notif(data.erro || 'Erro', 'erro'); return; }
    renderizarCheckboxPermissoes(data.permissoes);
  } catch {
    notif('Erro ao carregar permissões', 'erro');
  }
}

function renderizarCheckboxPermissoes(permissoes) {
  const grupos = {};
  permissoes.forEach(p => {
    if (!grupos[p.modulo]) grupos[p.modulo] = [];
    grupos[p.modulo].push(p);
  });

  document.getElementById('checkboxPermissoes').innerHTML = Object.entries(grupos).map(([mod, perms]) => `
    <div class="perm-grupo">
      <div class="perm-modulo">
        ${mod.toUpperCase()}
        <button type="button" class="btn-mini" onclick="toggleGrupo('${mod}', true)">Todos</button>
        <button type="button" class="btn-mini" onclick="toggleGrupo('${mod}', false)">Nenhum</button>
      </div>
      ${perms.map(p => `
        <label class="checkbox-label">
          <input type="checkbox" class="perm-check" data-id="${p.id}" data-modulo="${mod}" ${p.ativa ? 'checked' : ''}>
          <span class="check-acao">${p.acao}</span>
          <span class="check-desc">${p.descricao || ''}</span>
        </label>`).join('')}
    </div>`).join('');
}

function toggleGrupo(modulo, checked) {
  document.querySelectorAll(`.perm-check[data-modulo="${modulo}"]`)
    .forEach(cb => { cb.checked = checked; });
}

async function salvarPermissoesRole() {
  const checks = document.querySelectorAll('.perm-check:checked');
  const permissao_ids = Array.from(checks).map(cb => parseInt(cb.dataset.id));

  try {
    const r = await fetch(`/api/usuarios/roles/${_editandoRoleId}/permissoes`, {
      method: 'PUT', headers: _h(),
      body: JSON.stringify({ permissao_ids })
    });
    const data = await r.json();
    if (!r.ok) { notif(data.erro || 'Erro', 'erro'); return; }
    notif(`✅ ${data.total} permissões salvas`);
    fecharModal('modalEditarRole');
    listarRoles();
  } catch {
    notif('Erro de conexão', 'erro');
  }
}

// ============================================================
// HELPERS
// ============================================================
function fecharModal(id) {
  document.getElementById(id).classList.remove('ativo');
}

async function _preencherSelectRoles(selectId) {
  const sel = document.getElementById(selectId);
  try {
    const r = await fetch('/api/usuarios/roles', { headers: _h() });
    const roles = await r.json();
    if (!r.ok) return;
    sel.innerHTML = '<option value="">Selecione a role...</option>' +
      roles.map(r => `<option value="${r.id}">${r.nome.charAt(0).toUpperCase() + r.nome.slice(1)}</option>`).join('');
  } catch { /* silencioso */ }
}

// ============================================================
// INIT
// ============================================================
async function init() {
  // Preencher select de roles no form de criação
  await _preencherSelectRoles('novoRole');

  // Iniciar na aba "criar"
  abrirAba('criar');
}
