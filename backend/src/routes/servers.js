const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { execute } = require('../config/database');
const crypto = require('crypto');

router.get('/', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const filter = isAdmin ? '1=1' : 'user_id = ?';
  const binds = isAdmin ? [] : [req.user.id];

  try {
    const { rows } = await execute(
      `SELECT id, name, hostname, ip_address, os_type, timezone,
              agent_version, agent_token, status, last_seen_at, created_at
       FROM dbguard_servers WHERE ${filter}
       ORDER BY created_at DESC`,
      binds
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', auth, async (req, res) => {
  const { name, hostname, ip_address, os_type, timezone } = req.body;
  if (!name || !os_type)
    return res.status(400).json({ error: 'Nome e sistema operacional obrigatórios' });

  try {
    const agent_token = crypto.randomBytes(32).toString('hex');
    await execute(
      `INSERT INTO dbguard_servers (user_id, name, hostname, ip_address, os_type, timezone, agent_token, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'offline')`,
      [req.user.id, name, hostname || null, ip_address || null, os_type,
       timezone || 'America/Sao_Paulo', agent_token]
    );

    const { rows } = await execute(
      `SELECT id, name, hostname, ip_address, os_type, timezone,
              agent_version, agent_token, status, last_seen_at, created_at
       FROM dbguard_servers WHERE agent_token = ?`,
      [agent_token]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await execute(
      'DELETE FROM dbguard_servers WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Servidor removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;

// Atualizar servidor
router.put('/:id', auth, async (req, res) => {
  const { name, hostname, ip_address, os_type, timezone } = req.body;
  if (!name || !os_type)
    return res.status(400).json({ error: 'Nome e sistema operacional obrigatórios' });

  try {
    const { rows } = await execute(
      'SELECT id FROM dbguard_servers WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ error: 'Servidor não encontrado' });

    await execute(
      `UPDATE dbguard_servers
       SET name = ?, hostname = ?, ip_address = ?, os_type = ?, timezone = ?
       WHERE id = ? AND user_id = ?`,
      [name, hostname || null, ip_address || null, os_type,
       timezone || 'America/Sao_Paulo', req.params.id, req.user.id]
    );

    const { rows: updated } = await execute(
      `SELECT id, name, hostname, ip_address, os_type, timezone,
              agent_version, agent_token, status, last_seen_at, created_at
       FROM dbguard_servers WHERE id = ?`,
      [req.params.id]
    );

    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});
