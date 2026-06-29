const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { execute } = require('../config/database');

router.get('/summary', auth, async (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  const filter = isAdmin ? '1=1' : 'USER_ID = :userId';
  const binds = isAdmin ? {} : { userId };

  try {
    const [servers, jobs, alerts, storage] = await Promise.all([
      execute(`SELECT COUNT(*) AS TOTAL, SUM(CASE WHEN STATUS='online' THEN 1 ELSE 0 END) AS ONLINE FROM DBGUARD_SERVERS WHERE ${filter}`, binds),
      execute(`SELECT COUNT(*) AS TOTAL, SUM(CASE WHEN STATUS='success' THEN 1 ELSE 0 END) AS SUCCESS, SUM(CASE WHEN STATUS='failed' THEN 1 ELSE 0 END) AS FAILED FROM DBGUARD_BACKUP_JOBS WHERE ${filter}`, binds),
      execute(`SELECT COUNT(*) AS TOTAL, SUM(CASE WHEN IS_READ=0 THEN 1 ELSE 0 END) AS UNREAD FROM DBGUARD_ALERTS WHERE ${filter}`, binds),
      execute(`SELECT NVL(SUM(FILE_SIZE_MB),0) AS TOTAL_MB FROM DBGUARD_BACKUP_JOBS WHERE STATUS='success' AND ${filter}`, binds)
    ]);

    res.json({
      servers: servers.rows[0],
      jobs: jobs.rows[0],
      alerts: alerts.rows[0],
      storageUsedMB: storage.rows[0].TOTAL_MB
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Últimos 30 dias de backups para gráfico
router.get('/chart', auth, async (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  const filter = isAdmin ? '1=1' : 'USER_ID = :userId';
  const binds = isAdmin ? {} : { userId };

  try {
    const result = await execute(
      `SELECT TRUNC(CREATED_AT) AS DAY,
              COUNT(*) AS TOTAL,
              SUM(CASE WHEN STATUS='success' THEN 1 ELSE 0 END) AS SUCCESS,
              SUM(CASE WHEN STATUS='failed'  THEN 1 ELSE 0 END) AS FAILED
       FROM DBGUARD_BACKUP_JOBS
       WHERE CREATED_AT >= SYSDATE - 30 AND ${filter}
       GROUP BY TRUNC(CREATED_AT)
       ORDER BY TRUNC(CREATED_AT)`,
      binds
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
