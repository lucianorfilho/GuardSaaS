const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { execute } = require('../config/database');

router.get('/', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const filter = isAdmin ? '1=1' : 'j.user_id = ?';
  const binds = isAdmin ? [] : [req.user.id];

  try {
    const { rows } = await execute(
      `SELECT j.id, j.job_name, j.backup_type, j.status,
              j.file_name, j.file_size_mb, j.started_at, j.finished_at,
              j.error_message, s.name AS server_name
       FROM dbguard_backup_jobs j
       LEFT JOIN dbguard_servers s ON s.id = j.server_id
       WHERE ${filter}
       ORDER BY j.created_at DESC
       LIMIT 100`,
      binds
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/report', auth, async (req, res) => {
  const { server_id, job_name, backup_type, status,
          file_name, file_size_mb, storage_path,
          started_at, finished_at, error_message } = req.body;
  try {
    await execute(
      `INSERT INTO dbguard_backup_jobs
         (server_id, user_id, job_name, backup_type, status,
          file_name, file_size_mb, storage_path, started_at, finished_at, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [server_id, req.user.id, job_name, backup_type, status,
       file_name || null, file_size_mb || null, storage_path || null,
       started_at || null, finished_at || null, error_message || null]
    );
    res.status(201).json({ message: 'Relatório registrado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
