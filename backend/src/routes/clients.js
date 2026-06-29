const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { execute } = require('../config/database');
const { notifyClientApproved } = require('../config/email');
const fs = require('fs');
const path = require('path');

// Listar clientes
router.get('/', auth, admin, async (req, res) => {
  try {
    const { rows } = await execute(
      `SELECT u.id, u.name, u.email, u.company, u.phone, u.status, u.created_at,
              p.name AS plan_name,
              (SELECT COUNT(*) FROM dbguard_servers WHERE user_id = u.id) AS server_count,
              (SELECT COUNT(*) FROM dbguard_backup_jobs WHERE user_id = u.id AND status = 'success') AS backup_count,
              (SELECT COUNT(*) FROM dbguard_schedules WHERE user_id = u.id AND is_active = 1) AS active_schedules
       FROM dbguard_users u
       LEFT JOIN dbguard_subscriptions s ON s.user_id = u.id AND s.status = 'active'
       LEFT JOIN dbguard_plans p ON p.id = s.plan_id
       WHERE u.role = 'client'
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Detalhes completos do cliente
router.get('/:id', auth, admin, async (req, res) => {
  try {
    const { rows } = await execute(
      `SELECT u.id, u.name, u.email, u.company, u.phone, u.status, u.created_at,
              p.name AS plan_name, p.storage_limit_gb, p.backup_retention_days
       FROM dbguard_users u
       LEFT JOIN dbguard_subscriptions s ON s.user_id = u.id AND s.status = 'active'
       LEFT JOIN dbguard_plans p ON p.id = s.plan_id
       WHERE u.id = ? AND u.role = 'client'`,
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ error: 'Cliente não encontrado' });

    const client = rows[0];

    // Buscar servidores
    const { rows: servers } = await execute(
      'SELECT id, name, hostname, ip_address, os_type, status, last_seen_at FROM dbguard_servers WHERE user_id = ?',
      [req.params.id]
    );

    // Buscar últimos backups
    const { rows: backups } = await execute(
      `SELECT j.id, j.job_name, j.status, j.file_size_mb, j.started_at, s.name AS server_name
       FROM dbguard_backup_jobs j
       LEFT JOIN dbguard_servers s ON s.id = j.server_id
       WHERE j.user_id = ?
       ORDER BY j.created_at DESC LIMIT 5`,
      [req.params.id]
    );

    // Buscar agendamentos
    const { rows: schedules } = await execute(
      `SELECT sc.id, sc.name, sc.source_path, sc.frequency, sc.hour, sc.minute, sc.is_active
       FROM dbguard_schedules sc WHERE sc.user_id = ?`,
      [req.params.id]
    );

    res.json({ ...client, servers, backups, schedules });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Aprovar cliente
router.post('/:id/approve', auth, admin, async (req, res) => {
  try {
    const { rows } = await execute(
      'SELECT id, name, email FROM dbguard_users WHERE id = ? AND role = ?',
      [req.params.id, 'client']
    );
    if (!rows.length)
      return res.status(404).json({ error: 'Cliente não encontrado' });

    await execute(
      "UPDATE dbguard_users SET status = 'active' WHERE id = ?",
      [req.params.id]
    );

    const storagePath = path.join(process.env.STORAGE_PATH || '/var/www/dbguard/storage', `client_${req.params.id}`);
    if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });

    notifyClientApproved(rows[0]);
    res.json({ message: 'Cliente aprovado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Suspender cliente
router.post('/:id/suspend', auth, admin, async (req, res) => {
  try {
    await execute(
      "UPDATE dbguard_users SET status = 'suspended' WHERE id = ? AND role = 'client'",
      [req.params.id]
    );
    res.json({ message: 'Cliente suspenso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
