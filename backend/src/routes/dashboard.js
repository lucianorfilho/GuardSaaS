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

// Dashboard de Monitoramento — apenas para admin
router.get('/monitoring', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  try {
    // 1. Clientes com backup realizado com sucesso no último dia
    const { rows: successToday } = await execute(
      `SELECT COUNT(DISTINCT user_id) AS count
       FROM dbguard_backup_jobs
       WHERE status = 'success' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)`
    );

    // 2. Clientes com erro no backup (últimos 7 dias)
    const { rows: failedBackups } = await execute(
      `SELECT COUNT(DISTINCT user_id) AS count
       FROM dbguard_backup_jobs
       WHERE status = 'failed' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );

    // 3. Clientes que não enviaram backup no período esperado
    const { rows: noBackupRecently } = await execute(
      `SELECT COUNT(*) AS count
       FROM dbguard_users u
       WHERE u.role = 'client' AND u.status = 'active'
       AND u.id NOT IN (
         SELECT DISTINCT user_id FROM dbguard_backup_jobs
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       )`
    );

    // 4. Alertas de vencimento (planos que vencem em até 7 dias)
    const { rows: expiringPlans } = await execute(
      `SELECT u.id, u.name, u.email, s.expires_at, p.name AS plan_name,
              DATEDIFF(s.expires_at, NOW()) AS days_remaining
       FROM dbguard_subscriptions s
       JOIN dbguard_users u ON u.id = s.user_id
       JOIN dbguard_plans p ON p.id = s.plan_id
       WHERE s.status = 'active'
       AND s.expires_at IS NOT NULL
       AND s.expires_at <= DATE_ADD(NOW(), INTERVAL 7 DAY)
       AND s.expires_at > NOW()
       ORDER BY s.expires_at ASC`
    );

    // 5. Contas com pagamento vencido (3+ dias após expiração)
    const { rows: overdueAccounts } = await execute(
      `SELECT u.id, u.name, u.email, s.expires_at,
              DATEDIFF(NOW(), s.expires_at) AS days_overdue
       FROM dbguard_subscriptions s
       JOIN dbguard_users u ON u.id = s.user_id
       WHERE s.status = 'active'
       AND s.expires_at IS NOT NULL
       AND s.expires_at <= DATE_SUB(NOW(), INTERVAL 3 DAY)
       AND u.status = 'inactive'
       ORDER BY s.expires_at ASC`
    );

    res.json({
      backupSuccess: {
        count: successToday[0]?.count || 0,
        label: 'Clientes com backup realizado (último dia)'
      },
      backupFailed: {
        count: failedBackups[0]?.count || 0,
        label: 'Clientes com backup que apresentou erro (7 dias)'
      },
      noBackup: {
        count: noBackupRecently[0]?.count || 0,
        label: 'Clientes que não enviaram backup (7 dias)'
      },
      expiringPlans: {
        count: expiringPlans.length,
        label: 'Planos vencendo nos próximos 7 dias',
        accounts: expiringPlans
      },
      overdueAccounts: {
        count: overdueAccounts.length,
        label: 'Contas com pagamento vencido (3+ dias)',
        accounts: overdueAccounts
      },
      summary: {
        healthyClients: successToday[0]?.count || 0,
        problemClients: (failedBackups[0]?.count || 0) + (noBackupRecently[0]?.count || 0),
        expiringPlansCount: expiringPlans.length,
        overdueCount: overdueAccounts.length
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
