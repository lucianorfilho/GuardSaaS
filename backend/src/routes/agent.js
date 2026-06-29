const express = require('express');
const router = express.Router();
const { execute } = require('../config/database');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const logger = require('../config/logger');
const agentAudit = require('../middleware/agentAudit');
const { agentLimiter } = require('../middleware/rateLimiter');

// Aplicar rate limit e auditoria em todas as rotas do agente
router.use(agentLimiter);
router.use(agentAudit);

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const storagePath = process.env.STORAGE_PATH || '/var/www/dbguard/storage';
    cb(null, storagePath);
  },
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage: uploadStorage });

async function logAudit(server_id, user_id, event_type, ip_address, description, metadata) {
  try {
    await execute(
      `INSERT INTO dbguard_audit_logs
         (server_id, user_id, event_type, ip_address, description, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [server_id || null, user_id || null, event_type, ip_address,
       description, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    logger.error('Erro ao registrar audit log', { error: err.message });
  }
}

// Heartbeat
router.post('/heartbeat', async (req, res) => {
  const { token, agent_version, os_info } = req.body;
  if (!token) return res.status(400).json({ error: 'Token obrigatório' });

  try {
    const { rows } = await execute(
      'SELECT id, user_id FROM dbguard_servers WHERE agent_token = ?', [token]
    );
    if (!rows.length) {
      logger.warn('Heartbeat com token inválido', { ip: req.ip, token: token.substring(0,8) });
      return res.status(401).json({ error: 'Token inválido' });
    }

    await execute(
      `UPDATE dbguard_servers
       SET status = 'online', last_seen_at = NOW(), agent_version = ?
       WHERE agent_token = ?`,
      [agent_version || '1.0.0', token]
    );

    await logAudit(rows[0].id, rows[0].user_id, 'heartbeat', req.ip,
      `Agente online — v${agent_version}`, { os_info });

    res.json({ status: 'ok' });
  } catch (err) {
    logger.error('Erro no heartbeat', { error: err.message });
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Reportar resultado do backup
router.post('/report', async (req, res) => {
  const { token, job_id, status, file_name, file_size_mb, storage_path, error_message } = req.body;
  if (!token || !job_id) return res.status(400).json({ error: 'Token e job_id obrigatórios' });

  try {
    const { rows } = await execute(
      'SELECT id, user_id FROM dbguard_servers WHERE agent_token = ?', [token]
    );
    if (!rows.length) return res.status(401).json({ error: 'Token inválido' });

    await execute(
      `UPDATE dbguard_backup_jobs
       SET status = ?, file_name = ?, file_size_mb = ?,
           storage_path = ?, finished_at = NOW(), error_message = ?
       WHERE id = ?`,
      [status, file_name || null, file_size_mb || null,
       storage_path || null, error_message || null, job_id]
    );

    await logAudit(rows[0].id, rows[0].user_id, `backup_${status}`, req.ip,
      `Backup ${status}: ${file_name || 'sem nome'}`,
      { job_id, file_size_mb, error_message });

    if (status === 'failed') {
      const { rows: jobs } = await execute(
        'SELECT user_id, job_name FROM dbguard_backup_jobs WHERE id = ?', [job_id]
      );
      if (jobs.length) {
        await execute(
          `INSERT INTO dbguard_alerts (user_id, job_id, type, severity, message)
           VALUES (?, ?, 'backup_failed', 'error', ?)`,
          [jobs[0].user_id, job_id,
           `Backup falhou: ${jobs[0].job_name}. ${error_message || ''}`]
        );
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    logger.error('Erro no report', { error: err.message });
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Buscar configurações
router.get('/config/:token', async (req, res) => {
  try {
    const { rows } = await execute(
      `SELECT s.id, s.name, s.os_type, s.user_id,
              sc.id AS schedule_id, sc.source_path, sc.destination,
              sc.retention_days, sc.frequency, sc.hour, sc.minute
       FROM dbguard_servers s
       LEFT JOIN dbguard_schedules sc ON sc.server_id = s.id AND sc.is_active = 1
       WHERE s.agent_token = ?`,
      [req.params.token]
    );

    if (!rows.length) return res.status(401).json({ error: 'Token inválido' });

    await logAudit(rows[0].id, rows[0].user_id, 'config_fetch', req.ip,
      'Agente buscou configurações', null);

    res.json({
      server: { id: rows[0].id, name: rows[0].name, os_type: rows[0].os_type },
      schedules: rows.filter(r => r.schedule_id).map(r => ({
        id:             r.schedule_id,
        source_path:    r.source_path,
        destination:    r.destination,
        retention_days: r.retention_days,
        frequency:      r.frequency,
        hour:           r.hour,
        minute:         r.minute
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Download do agente
router.get('/download/:os', (req, res) => {
  const files = {
    'linux-debian': 'dbguard-agent-debian.sh',
    'linux-redhat': 'dbguard-agent-redhat.sh',
    'windows':      'dbguard-agent-windows.ps1'
  };

  const file = files[req.params.os];
  if (!file) return res.status(404).json({ error: 'OS não suportado' });

  const filePath = path.join(__dirname, '../../agents', file);
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: 'Agente não disponível' });

  res.download(filePath);
});

// Upload do backup
router.post('/upload', upload.single('file'), async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token obrigatório' });

  try {
    const { rows } = await execute(
      'SELECT id, user_id FROM dbguard_servers WHERE agent_token = ?', [token]
    );
    if (!rows.length) return res.status(401).json({ error: 'Token inválido' });

    const clientDir = path.join(
      process.env.STORAGE_PATH || '/var/www/dbguard/storage',
      `client_${rows[0].user_id}`
    );
    if (!fs.existsSync(clientDir)) fs.mkdirSync(clientDir, { recursive: true });

    const finalPath = path.join(clientDir, req.file.originalname);
    fs.renameSync(req.file.path, finalPath);

    const fileSizeMB = req.file.size / (1024 * 1024);

    await logAudit(rows[0].id, rows[0].user_id, 'backup_upload', req.ip,
      `Upload recebido: ${req.file.originalname}`,
      { file_name: req.file.originalname, size_mb: fileSizeMB.toFixed(2) });

    logger.info('Backup recebido', {
      server_id: rows[0].id,
      file: req.file.originalname,
      size_mb: fileSizeMB.toFixed(2)
    });

    res.json({ storage_path: finalPath, message: 'Upload concluído' });
  } catch (err) {
    logger.error('Erro no upload', { error: err.message });
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;

// Buscar jobs pendentes para executar
router.get('/jobs/:token', async (req, res) => {
  try {
    const { rows: servers } = await execute(
      'SELECT id, user_id FROM dbguard_servers WHERE agent_token = ?',
      [req.params.token]
    );
    if (!servers.length) return res.status(401).json({ error: 'Token inválido' });

    const { rows: jobs } = await execute(
      `SELECT j.id, j.job_name, sc.source_path, sc.destination, sc.retention_days
       FROM dbguard_backup_jobs j
       JOIN dbguard_schedules sc ON sc.name = j.job_name AND sc.server_id = ?
       WHERE j.server_id = ? AND j.status IN ('pending', 'running')
       ORDER BY j.created_at DESC LIMIT 5`,
      [servers[0].id, servers[0].id]
    );

    res.json({ jobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});
