const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { execute } = require('../config/database');
const fs = require('fs');

// Listar audit logs
router.get('/', auth, admin, async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const page  = parseInt(req.query.page)  || 1;
  const offset = (page - 1) * limit;

  try {
    const { rows } = await execute(
      `SELECT a.*, s.name AS server_name, u.name AS user_name
       FROM dbguard_audit_logs a
       LEFT JOIN dbguard_servers s ON s.id = a.server_id
       LEFT JOIN dbguard_users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Ler arquivo de log do agente
router.get('/agent-file', auth, admin, (req, res) => {
  const logFile = '/var/log/dbguard/agent-audit.log';
  try {
    if (!fs.existsSync(logFile))
      return res.json({ lines: [] });

    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.trim().split('\n')
      .filter(Boolean)
      .map(line => {
        try { return JSON.parse(line); }
        catch { return { raw: line }; }
      })
      .reverse()
      .slice(0, 100);

    res.json({ lines });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao ler logs' });
  }
});

module.exports = router;
