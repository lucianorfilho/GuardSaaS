const express = require('express');
const router = express.Router();
const { execute } = require('../config/database');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const logger = require('../config/logger');
const agentAudit = require('../middleware/agentAudit');
const { agentLimiter } = require('../middleware/rateLimiter');
const { uploadToOCI } = require('../../config/oci');
const { checkQuota, registerObject } = require('../services/storageQuota');

router.use(agentLimiter);
router.use(agentAudit);

const uploadTemp = multer({ dest: '/tmp/dbguard_uploads/' });

async function logAudit(server_id, user_id, event_type, ip, description, metadata) {
  try {
    await execute(
      `INSERT INTO dbguard_audit_logs (server_id, user_id, event_type, ip_address, description, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [server_id||null, user_id||null, event_type, ip, description, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) { logger.error('Audit log error', { error: err.message }); }
}

// Heartbeat
router.post('/heartbeat', async (req, res) => {
  const { token, agent_version, os_info } = req.body;
  if (!token) return res.status(400).json({ error: 'Token obrigatório' });
  try {
    const { rows } = await execute('SELECT id, user_id FROM dbguard_servers WHERE agent_token = ?', [token]);
    if (!rows.length) return res.status(401).json({ error: 'Token inválido' });
    await execute(
      `UPDATE dbguard_servers SET status='online', last_seen_at=NOW(), agent_version=? WHERE agent_token=?`,
      [agent_version || '1.0.0', token]
    );
    await logAudit(rows[0].id, rows[0].user_id, 'heartbeat', req.ip, `Agente online v${agent_version}`, { os_info });
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Buscar configuração
router.get('/config/:token', async (req, res) => {
  try {
    const { rows } = await execute(
      `SELECT s.id, s.name, s.os_type, s.user_id,
              sc.id AS schedule_id, sc.name AS schedule_name,
              sc.source_path, sc.backup_mode, sc.destination,
              sc.db_type, sc.db_host, sc.db_port, sc.db_name, sc.db_user, sc.db_password,
              sc.retention_days, sc.frequency, sc.hour, sc.minute
       FROM dbguard_servers s
       LEFT JOIN dbguard_schedules sc ON sc.server_id = s.id AND sc.is_active = 1
       WHERE s.agent_token = ?`,
      [req.params.token]
    );
    if (!rows.length) return res.status(401).json({ error: 'Token inválido' });
    await logAudit(rows[0].id, rows[0].user_id, 'config_fetch', req.ip, 'Agente buscou configurações', null);
    res.json({
      server: { id: rows[0].id, name: rows[0].name, os_type: rows[0].os_type },
      schedules: rows.filter(r => r.schedule_id).map(r => ({
        id: r.schedule_id, name: r.schedule_name,
        backup_mode: r.backup_mode || 'files', source_path: r.source_path,
        destination: r.destination, retention_days: r.retention_days,
        frequency: r.frequency, hour: r.hour, minute: r.minute,
        db_type: r.db_type, db_host: r.db_host, db_port: r.db_port,
        db_name: r.db_name, db_user: r.db_user, db_password: r.db_password
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Buscar jobs pendentes
router.get('/jobs/:token', async (req, res) => {
  try {
    const { rows: servers } = await execute(
      'SELECT id, user_id FROM dbguard_servers WHERE agent_token = ?', [req.params.token]
    );
    if (!servers.length) return res.status(401).json({ error: 'Token inválido' });
    const { rows: jobs } = await execute(
      `SELECT j.id, j.job_name,
              sc.source_path, sc.backup_mode, sc.destination, sc.retention_days,
              sc.db_type, sc.db_host, sc.db_port, sc.db_name, sc.db_user, sc.db_password
       FROM dbguard_backup_jobs j
       JOIN dbguard_schedules sc ON sc.name = j.job_name AND sc.server_id = ?
       WHERE j.server_id = ? AND j.status IN ('pending','running')
       ORDER BY j.created_at DESC LIMIT 5`,
      [servers[0].id, servers[0].id]
    );
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Reportar resultado
router.post('/report', async (req, res) => {
  const { token, job_id, status, file_name, file_size_mb, storage_path, error_message } = req.body;
  if (!token || !job_id) return res.status(400).json({ error: 'Token e job_id obrigatórios' });
  try {
    const { rows } = await execute('SELECT id, user_id FROM dbguard_servers WHERE agent_token = ?', [token]);
    if (!rows.length) return res.status(401).json({ error: 'Token inválido' });
    await execute(
      `UPDATE dbguard_backup_jobs
       SET status=?, file_name=?, file_size_mb=?, storage_path=?, finished_at=NOW(), error_message=?
       WHERE id=?`,
      [status, file_name||null, file_size_mb||null, storage_path||null, error_message||null, job_id]
    );
    await logAudit(rows[0].id, rows[0].user_id, `backup_${status}`, req.ip,
      `Backup ${status}: ${file_name||'sem nome'}`, { job_id, file_size_mb, error_message });
    if (status === 'failed') {
      const { rows: jobs } = await execute(
        'SELECT user_id, job_name FROM dbguard_backup_jobs WHERE id = ?', [job_id]
      );
      if (jobs.length) {
        await execute(
          `INSERT INTO dbguard_alerts (user_id, job_id, type, severity, message)
           VALUES (?, ?, 'backup_failed', 'error', ?)`,
          [jobs[0].user_id, job_id, `Backup falhou: ${jobs[0].job_name}. ${error_message||''}`]
        );
      }
    }
    res.json({ status: 'ok' });
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
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Agente não disponível' });
  res.download(filePath);
});

// Upload do backup com verificação de quota
router.post('/upload', uploadTemp.single('file'), async (req, res) => {
  const { token, job_id } = req.body;
  if (!token) return res.status(400).json({ error: 'Token obrigatório' });

  try {
    const { rows: serverRows } = await execute(
      'SELECT id, user_id FROM dbguard_servers WHERE agent_token = ?', [token]
    );
    if (!serverRows.length) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(401).json({ error: 'Token inválido' });
    }

    const serverId   = serverRows[0].id;
    const clientId   = serverRows[0].user_id;

    // Verificar status da conta
    const { rows: userRows } = await execute(
      'SELECT status FROM dbguard_users WHERE id = ?', [clientId]
    );
    if (!userRows.length || userRows[0].status !== 'active') {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Conta inativada. Verifique com o administrador.' });
    }

    const fileSizeMB = req.file.size / (1024 * 1024);

    // Verificar quota
    const quota = await checkQuota(clientId, fileSizeMB);
    if (!quota.allowed) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: quota.reason, usage: quota.usage, plan: quota.plan });
    }

    const objectName = `client_${clientId}/${req.file.originalname}`;
    const result     = await uploadToOCI(req.file.path, objectName);
    fs.unlinkSync(req.file.path);

    // Registrar no banco
    await registerObject(clientId, objectName, req.file.originalname, result.sizeMB, job_id || null);

    await logAudit(serverId, clientId, 'backup_upload', req.ip,
      `Upload OCI: ${req.file.originalname}`, { size_mb: result.sizeMB.toFixed(2) });

    res.json({ storage_path: result.path, size_mb: result.sizeMB, message: 'Upload OCI concluído' });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Erro no upload: ' + err.message });
  }
});

module.exports = router;
