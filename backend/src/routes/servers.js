const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { execute } = require('../config/database');

router.get('/', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const filter = isAdmin ? '1=1' : 'user_id = ?';
  const binds = isAdmin ? [] : [req.user.id];

  try {
    const { rows } = await execute(
      `SELECT id, name, hostname, ip_address, os_type,
              agent_version, status, last_seen_at, created_at
       FROM dbguard_servers WHERE ${filter}
       ORDER BY created_at DESC`,
      binds
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
