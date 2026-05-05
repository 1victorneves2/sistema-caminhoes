const bcrypt = require('bcryptjs');
const { invalidarCache } = require('../middlewares/verificarPermissao');

const usuarioController = {

  // GET /api/usuarios
  async listar(req, res) {
    try {
      const { empresa_id } = req.user;
      const { role, ativo } = req.query;

      let where = 'WHERE u.empresa_id = $1';
      const valores = [empresa_id];
      let idx = 2;

      if (role) {
        where += ` AND u.role = $${idx++}`;
        valores.push(role);
      }
      if (ativo !== undefined) {
        where += ` AND u.ativo = $${idx++}`;
        valores.push(ativo === 'true');
      }

      const resultado = await global.db.query(
        `SELECT u.id, u.email, u.nome, u.role, u.ativo, u.criado_em,
                r.id AS role_id, r.nome AS role_nome, r.descricao AS role_descricao
         FROM usuarios u
         LEFT JOIN roles r ON u.role_id = r.id
         ${where}
         ORDER BY u.nome`,
        valores
      );
      res.json(resultado.rows);
    } catch (err) {
      console.error('Erro ao listar usuários:', err.message);
      res.status(500).json({ erro: 'Erro ao listar usuários' });
    }
  },

  // GET /api/roles
  async listarRoles(req, res) {
    try {
      const { empresa_id } = req.user;
      const resultado = await global.db.query(
        `SELECT r.id, r.nome, r.descricao,
                COUNT(u.id) AS total_usuarios,
                COUNT(rp.id) AS total_permissoes
         FROM roles r
         LEFT JOIN usuarios u         ON u.role_id = r.id AND u.ativo = true
         LEFT JOIN role_permissoes rp ON rp.role_id = r.id
         WHERE r.empresa_id = $1
         GROUP BY r.id, r.nome, r.descricao
         ORDER BY r.nome`,
        [empresa_id]
      );
      res.json(resultado.rows);
    } catch (err) {
      console.error('Erro ao listar roles:', err.message);
      res.status(500).json({ erro: 'Erro ao listar roles' });
    }
  },

  // GET /api/roles/:id/permissoes
  async permissoesRole(req, res) {
    try {
      const { id } = req.params;
      const { empresa_id } = req.user;

      const role = await global.db.query(
        `SELECT id, nome, descricao FROM roles WHERE id = $1 AND empresa_id = $2`,
        [id, empresa_id]
      );
      if (!role.rows.length) return res.status(404).json({ erro: 'Role não encontrada' });

      const todas = await global.db.query(
        `SELECT p.id, p.modulo, p.acao, p.descricao,
                (rp.id IS NOT NULL) AS ativa
         FROM permissoes p
         LEFT JOIN role_permissoes rp ON rp.permissao_id = p.id AND rp.role_id = $1
         ORDER BY p.modulo, p.acao`,
        [id]
      );

      res.json({ role: role.rows[0], permissoes: todas.rows });
    } catch (err) {
      console.error('Erro ao listar permissões da role:', err.message);
      res.status(500).json({ erro: 'Erro ao listar permissões da role' });
    }
  },

  // PUT /api/roles/:id/permissoes
  async salvarPermissoesRole(req, res) {
    try {
      const { id } = req.params;
      const { permissao_ids } = req.body;
      const { empresa_id } = req.user;

      if (!Array.isArray(permissao_ids)) {
        return res.status(400).json({ erro: 'permissao_ids deve ser um array' });
      }

      const role = await global.db.query(
        `SELECT id, nome FROM roles WHERE id = $1 AND empresa_id = $2`,
        [id, empresa_id]
      );
      if (!role.rows.length) return res.status(404).json({ erro: 'Role não encontrada' });

      const client = await global.db.connect();
      try {
        await client.query('BEGIN');
        await client.query(`DELETE FROM role_permissoes WHERE role_id = $1`, [id]);
        if (permissao_ids.length) {
          const vals = permissao_ids.map((pid, i) => `($1, $${i + 2})`).join(',');
          await client.query(
            `INSERT INTO role_permissoes (role_id, permissao_id) VALUES ${vals}
             ON CONFLICT DO NOTHING`,
            [id, ...permissao_ids]
          );
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }

      const { invalidarCache } = require('../middlewares/verificarPermissao');
      invalidarCache(role.rows[0].nome, empresa_id);

      res.json({ mensagem: 'Permissões salvas', total: permissao_ids.length });
    } catch (err) {
      console.error('Erro ao salvar permissões da role:', err.message);
      res.status(500).json({ erro: 'Erro ao salvar permissões' });
    }
  },

  // GET /api/usuarios/:id/permissoes
  async listarPermissoes(req, res) {
    try {
      const { id } = req.params;
      const { empresa_id } = req.user;

      const usuario = await global.db.query(
        `SELECT u.id, u.nome, u.email, u.role, r.id AS role_id, r.nome AS role_nome
         FROM usuarios u
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE u.id = $1 AND u.empresa_id = $2`,
        [id, empresa_id]
      );

      if (!usuario.rows.length) {
        return res.status(404).json({ erro: 'Usuário não encontrado' });
      }

      const permissoes = await global.db.query(
        `SELECT p.modulo, p.acao, p.descricao
         FROM permissoes p
         JOIN role_permissoes rp ON p.id = rp.permissao_id
         WHERE rp.role_id = $1
         ORDER BY p.modulo, p.acao`,
        [usuario.rows[0].role_id]
      );

      res.json({
        usuario: usuario.rows[0],
        permissoes: permissoes.rows
      });
    } catch (err) {
      console.error('Erro ao listar permissões do usuário:', err.message);
      res.status(500).json({ erro: 'Erro ao listar permissões' });
    }
  },

  // POST /api/usuarios
  async criar(req, res) {
    try {
      const { email, nome, senha, role, role_id: roleIdParam } = req.body;
      const { empresa_id } = req.user;

      if (!email || !nome || !senha || (!role && !roleIdParam)) {
        return res.status(400).json({ erro: 'email, nome, senha e role são obrigatórios' });
      }
      if (senha.length < 6) {
        return res.status(400).json({ erro: 'Senha deve ter no mínimo 6 caracteres' });
      }

      let roleQuery;
      if (roleIdParam) {
        roleQuery = await global.db.query(
          `SELECT id, nome FROM roles WHERE id = $1 AND empresa_id = $2`,
          [roleIdParam, empresa_id]
        );
      } else {
        roleQuery = await global.db.query(
          `SELECT id, nome FROM roles WHERE nome = $1 AND empresa_id = $2`,
          [role, empresa_id]
        );
      }

      if (!roleQuery.rows.length) {
        return res.status(400).json({ erro: 'Role não encontrada para esta empresa' });
      }

      const roleRow = roleQuery.rows[0];
      const senhaHash = await bcrypt.hash(senha, 10);

      const resultado = await global.db.query(
        `INSERT INTO usuarios (email, nome, senha, role, role_id, empresa_id, ativo)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id, email, nome, role, role_id, ativo, criado_em`,
        [email, nome, senhaHash, roleRow.nome, roleRow.id, empresa_id]
      );

      res.status(201).json(resultado.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ erro: 'Email já cadastrado' });
      }
      console.error('Erro ao criar usuário:', err.message);
      res.status(500).json({ erro: 'Erro ao criar usuário' });
    }
  },

  // PUT /api/usuarios/:id
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const { nome, email, senha, role, ativo } = req.body;
      const { empresa_id } = req.user;

      const campos = [];
      const valores = [];
      let idx = 1;

      if (nome  !== undefined) { campos.push(`nome = $${idx++}`);  valores.push(nome); }
      if (email !== undefined) { campos.push(`email = $${idx++}`); valores.push(email); }
      if (ativo !== undefined) { campos.push(`ativo = $${idx++}`); valores.push(ativo); }

      if (senha) {
        campos.push(`senha = $${idx++}`);
        valores.push(await bcrypt.hash(senha, 10));
      }

      const roleParam = role || req.body.role_id;
      if (roleParam) {
        let roleQuery;
        if (req.body.role_id) {
          roleQuery = await global.db.query(
            `SELECT id, nome FROM roles WHERE id = $1 AND empresa_id = $2`,
            [req.body.role_id, empresa_id]
          );
        } else {
          roleQuery = await global.db.query(
            `SELECT id, nome FROM roles WHERE nome = $1 AND empresa_id = $2`,
            [role, empresa_id]
          );
        }
        if (!roleQuery.rows.length) {
          return res.status(400).json({ erro: 'Role não encontrada' });
        }
        const rr = roleQuery.rows[0];
        campos.push(`role = $${idx++}`);
        valores.push(rr.nome);
        campos.push(`role_id = $${idx++}`);
        valores.push(rr.id);
        invalidarCache(rr.nome, empresa_id);
      }

      if (!campos.length) {
        return res.status(400).json({ erro: 'Nenhum campo para atualizar' });
      }

      valores.push(id, empresa_id);
      const resultado = await global.db.query(
        `UPDATE usuarios SET ${campos.join(', ')}
         WHERE id = $${idx++} AND empresa_id = $${idx}
         RETURNING id, email, nome, role, role_id, ativo`,
        valores
      );

      if (!resultado.rows.length) {
        return res.status(404).json({ erro: 'Usuário não encontrado' });
      }

      res.json(resultado.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ erro: 'Email já cadastrado' });
      }
      console.error('Erro ao atualizar usuário:', err.message);
      res.status(500).json({ erro: 'Erro ao atualizar usuário' });
    }
  },

  // PUT /api/usuarios/:id/alterar-senha
  async alterarSenha(req, res) {
    try {
      const { id: idAlvo } = req.params;
      const { senha_atual, senha_nova } = req.body;
      const { id: idLogado, empresa_id, role } = req.user;

      if (!senha_nova || senha_nova.length < 6) {
        return res.status(400).json({ erro: 'Nova senha deve ter no mínimo 6 caracteres' });
      }

      const mesmaPessoa = parseInt(idAlvo) === idLogado;

      // Admin pode alterar qualquer senha da empresa; usuário comum só a própria
      if (!mesmaPessoa && role !== 'admin') {
        return res.status(403).json({ erro: 'Sem permissão para alterar senha de outro usuário' });
      }

      const resultado = await global.db.query(
        `SELECT senha FROM usuarios WHERE id = $1 AND empresa_id = $2`,
        [idAlvo, empresa_id]
      );
      if (!resultado.rows.length) {
        return res.status(404).json({ erro: 'Usuário não encontrado' });
      }

      // Usuário alterando a própria senha deve confirmar a senha atual
      if (mesmaPessoa) {
        if (!senha_atual) {
          return res.status(400).json({ erro: 'Informe a senha atual' });
        }
        const correta = await bcrypt.compare(senha_atual, resultado.rows[0].senha);
        if (!correta) {
          return res.status(400).json({ erro: 'Senha atual incorreta' });
        }
      }

      const novaHash = await bcrypt.hash(senha_nova, 10);
      await global.db.query(
        `UPDATE usuarios SET senha = $1 WHERE id = $2 AND empresa_id = $3`,
        [novaHash, idAlvo, empresa_id]
      );

      res.json({ mensagem: 'Senha alterada com sucesso' });
    } catch (err) {
      console.error('Erro ao alterar senha:', err.message);
      res.status(500).json({ erro: 'Erro ao alterar senha' });
    }
  },

  // DELETE /api/usuarios/:id
  async deletar(req, res) {
    try {
      const { id } = req.params;
      const { empresa_id, id: userId } = req.user;

      if (parseInt(id) === userId) {
        return res.status(400).json({ erro: 'Não é possível deletar o próprio usuário' });
      }

      const resultado = await global.db.query(
        `DELETE FROM usuarios WHERE id = $1 AND empresa_id = $2 RETURNING id, nome`,
        [id, empresa_id]
      );

      if (!resultado.rows.length) {
        return res.status(404).json({ erro: 'Usuário não encontrado' });
      }

      res.json({ mensagem: 'Usuário deletado', usuario: resultado.rows[0] });
    } catch (err) {
      console.error('Erro ao deletar usuário:', err.message);
      res.status(500).json({ erro: 'Erro ao deletar usuário' });
    }
  }
};

module.exports = usuarioController;
