const express = require('express');
const router = express.Router();
const { execute } = require('../config/database');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const storagePath = process.env.STORAGE_PATH || '/var/www/dbguard/storage';
    cb(null, storagePath);
  },
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage: uploadStorage });

// Heartbeat
router.post('/heartbeat', async (req, res) => {
  const { token, agent_version, os_info } = req.body;
  if (!token) return res.status(400).json({ error: 'Token obrigatório' });

  try {
    const { rows } = await execute(
      'SELECT id FROM dbguard_servers WHERE agent_token = ?', [token]
    );
    if (!rows.length) return res.status(401).json({ error: 'Token inválido' });

    await execute(
      `UPDATE dbguard_servers
       SET status = 'online', last_seen_at = NOW(), agent_version = ?
       WHERE agent_token = ?`,
      [agent_version || '1.0.0', token]
    );
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Reportar resultado do backup
router.post('/report', async (req, res) => {
  const { token, job_id, status, file_name, file_size_mb, storage_path, error_message } = req.body;
  if (!token || !job_id) return res.status(400).json({ error: 'Token e job_id obrigatórios' });

  try {
    const { rows } = await execute(
      'SELECT id FROM dbguard_servers WHERE agent_token = ?', [token]
    );
    if (!rows.length) return res.status(401).json({ error: 'Token inválido' });

    await execute(
      `UPDATE dbguard_backup_jobs
       SET status = ?, file_name = ?, file_size_mb = ?,
           storage_path = ?, finished_at = NOW(), error_message = ?
       WHERE id = ?`,
      [status, file_name || null, file_size_mb || null, storage_path || null, error_message || null, job_id]
    );

    if (status === 'failed') {
      const { rows: jobs } = await execute(
        'SELECT user_id, job_name FROM dbguard_backup_jobs WHERE id = ?', [job_id]
      );
      if (jobs.length) {
        await execute(
          `INSERT INTO dbguard_alerts (user_id, job_id, type, severity, message)
           VALUES (?, ?, 'backup_failed', 'error', ?)`,
          [jobs[0].user_id, job_id, `Backup falhou: ${jobs[0].job_name}. ${error_message || ''}`]
        );
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Buscar configurações
router.get('/config/:token', async (req, res) => {
  try {
    const { rows } = await execute(
      `SELECT s.id, s.name, s.os_type,
              sc.id AS schedule_id, sc.source_path, sc.destination,
              sc.retention_days, sc.frequency, sc.hour, sc.minute
       FROM dbguard_servers s
       LEFT JOIN dbguard_schedules sc ON sc.server_id = s.id AND sc.is_active = 1
       WHERE s.agent_token = ?`,
      [req.params.token]
    );

    if (!rows.length) return res.status(401).json({ error: 'Token inválido' });

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
  const os = req.params.os;
  const files = {
    'linux-debian': 'dbguard-agent-debian.sh',
    'linux-redhat': 'dbguard-agent-redhat.sh',
    'windows':      'dbguard-agent-windows.ps1'
  };

  const file = files[os];
  if (!file) return res.status(404).json({ error: 'OS não suportado' });

  const filePath = path.join(__dirname, '../agents', file);
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: 'Agente não disponível ainda' });

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

    res.json({ storage_path: finalPath, message: 'Upload concluído' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
