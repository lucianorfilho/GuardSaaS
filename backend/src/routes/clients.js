const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { execute } = require('../config/database');
const { notifyClientApproved } = require('../config/email');
const { createClientFolder } = require('../services/storageQuota');

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

router.get('/:id', auth, admin, async (req, res) => {
  try {
    const { rows } = await execute(
      `SELECT u.id, u.name, u.email, u.company, u.phone, u.status, u.created_at,
              p.name AS plan_name, p.storage_limit_gb, p.max_files, p.backup_retention_days
       FROM dbguard_users u
       LEFT JOIN dbguard_subscriptions s ON s.user_id = u.id AND s.status = 'active'
       LEFT JOIN dbguard_plans p ON p.id = s.plan_id
       WHERE u.id = ? AND u.role = 'client'`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cliente não encontrado' });

    const { rows: servers } = await execute(
      'SELECT id, name, hostname, ip_address, os_type, status, last_seen_at FROM dbguard_servers WHERE user_id = ?',
      [req.params.id]
    );
    const { rows: backups } = await execute(
      `SELECT j.id, j.job_name, j.status, j.file_size_mb, j.started_at, s.name AS server_name
       FROM dbguard_backup_jobs j
       LEFT JOIN dbguard_servers s ON s.id = j.server_id
       WHERE j.user_id = ? ORDER BY j.created_at DESC LIMIT 5`,
      [req.params.id]
    );
    const { rows: schedules } = await execute(
      'SELECT id, name, source_path, frequency, hour, minute, is_active FROM dbguard_schedules WHERE user_id = ?',
      [req.params.id]
    );

    res.json({ ...rows[0], servers, backups, schedules });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Aprovar cliente — cria pasta no OCI automaticamente
router.post('/:id/approve', auth, admin, async (req, res) => {
  try {
    const { rows } = await execute(
      'SELECT id, name, email FROM dbguard_users WHERE id = ? AND role = ?',
      [req.params.id, 'client']
    );
    if (!rows.length) return res.status(404).json({ error: 'Cliente não encontrado' });

    await execute(
      "UPDATE dbguard_users SET status = 'active' WHERE id = ?",
      [req.params.id]
    );

    // Criar pasta no OCI Object Storage
    try {
      await createClientFolder(req.params.id);
      console.log(`✅ Pasta OCI criada para cliente ${req.params.id}`);
    } catch (ociErr) {
      console.error(`⚠️ Erro ao criar pasta OCI para cliente ${req.params.id}:`, ociErr.message);
      // Não falha a aprovação por erro no OCI
    }

    // Atribuir plano Free automaticamente
    const { rows: freePlan } = await execute(
      "SELECT id FROM dbguard_plans WHERE name = 'Free' LIMIT 1"
    );
    if (freePlan.length) {
      await execute(
        `INSERT INTO dbguard_subscriptions (user_id, plan_id, status)
         VALUES (?, ?, 'active')
         ON DUPLICATE KEY UPDATE status = 'active'`,
        [req.params.id, freePlan[0].id]
      );
    }

    notifyClientApproved(rows[0]);
    res.json({ message: 'Cliente aprovado, pasta OCI criada e plano Free ativado!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

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
