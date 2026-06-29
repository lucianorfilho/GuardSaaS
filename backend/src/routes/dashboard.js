const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { execute } = require('../config/database');

router.get('/summary', auth, async (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  const filter = isAdmin ? '1=1' : 'user_id = ?';
  const binds = isAdmin ? [] : [userId];

  try {
    const [servers, jobs, alerts, storage] = await Promise.all([
      execute(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='online' THEN 1 ELSE 0 END) AS online FROM dbguard_servers WHERE ${filter}`, binds),
      execute(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) AS success, SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed FROM dbguard_backup_jobs WHERE ${filter}`, binds),
      execute(`SELECT COUNT(*) AS total, SUM(CASE WHEN is_read=0 THEN 1 ELSE 0 END) AS unread FROM dbguard_alerts WHERE ${filter}`, binds),
      execute(`SELECT COALESCE(SUM(file_size_mb),0) AS total_mb FROM dbguard_backup_jobs WHERE status='success' AND ${filter}`, binds)
    ]);

    res.json({
      servers: servers.rows[0],
      jobs: jobs.rows[0],
      alerts: alerts.rows[0],
      storageUsedMB: storage.rows[0].total_mb
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/chart', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const filter = isAdmin ? '1=1' : 'user_id = ?';
  const binds = isAdmin ? [] : [req.user.id];

  try {
    const { rows } = await execute(
      `SELECT DATE(created_at) AS DAY,
              COUNT(*) AS TOTAL,
              SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) AS SUCCESS,
              SUM(CASE WHEN status='failed'  THEN 1 ELSE 0 END) AS FAILED
       FROM dbguard_backup_jobs
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND ${filter}
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at)`,
      binds
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
