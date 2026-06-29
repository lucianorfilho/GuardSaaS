const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { execute } = require('../config/database');

// Listar jobs de backup
router.get('/', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const filter = isAdmin ? '1=1' : 'J.USER_ID = :userId';
  const binds = isAdmin ? {} : { userId: req.user.id };

  try {
    const result = await execute(
      `SELECT J.ID, J.JOB_NAME, J.BACKUP_TYPE, J.STATUS,
              J.FILE_NAME, J.FILE_SIZE_MB, J.STARTED_AT, J.FINISHED_AT,
              J.ERROR_MESSAGE, S.NAME AS SERVER_NAME
       FROM DBGUARD_BACKUP_JOBS J
       LEFT JOIN DBGUARD_SERVERS S ON S.ID = J.SERVER_ID
       WHERE ${filter}
       ORDER BY J.CREATED_AT DESC
       FETCH FIRST 100 ROWS ONLY`,
      binds
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Receber relatório do agente
router.post('/report', auth, async (req, res) => {
  const { server_id, job_name, backup_type, status,
          file_name, file_size_mb, storage_path,
          started_at, finished_at, error_message } = req.body;

  try {
    await execute(
      `INSERT INTO DBGUARD_BACKUP_JOBS
         (SERVER_ID, USER_ID, JOB_NAME, BACKUP_TYPE, STATUS,
          FILE_NAME, FILE_SIZE_MB, STORAGE_PATH, STARTED_AT, FINISHED_AT, ERROR_MESSAGE)
       VALUES
         (:server_id, :user_id, :job_name, :backup_type, :status,
          :file_name, :file_size_mb, :storage_path,
          TO_TIMESTAMP(:started_at,'YYYY-MM-DD HH24:MI:SS'),
          TO_TIMESTAMP(:finished_at,'YYYY-MM-DD HH24:MI:SS'),
          :error_message)`,
      {
        server_id, user_id: req.user.id, job_name,
        backup_type, status, file_name,
        file_size_mb: file_size_mb || null,
        storage_path: storage_path || null,
        started_at, finished_at,
        error_message: error_message || null
      }
    );
    res.status(201).json({ message: 'Relatório registrado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
