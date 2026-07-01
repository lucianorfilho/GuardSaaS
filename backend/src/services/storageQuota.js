const { execute } = require('../config/database');
const { uploadToOCI, deleteObject } = require('../../config/oci');
const fs = require('fs');
const os = require('os');
const path = require('path');

async function getClientPlan(userId) {
  const { rows } = await execute(
    `SELECT p.name, p.storage_limit_gb, p.max_files, p.backup_retention_days
     FROM dbguard_subscriptions s
     JOIN dbguard_plans p ON p.id = s.plan_id
     WHERE s.user_id = ? AND s.status = 'active'
     ORDER BY s.created_at DESC LIMIT 1`,
    [userId]
  );
  if (!rows.length) {
    return { name: 'Free', storage_limit_gb: 2, max_files: 1, backup_retention_days: 7 };
  }
  return rows[0];
}

async function getClientUsage(userId) {
  const { rows } = await execute(
    `SELECT COUNT(*) AS file_count, COALESCE(SUM(file_size_mb), 0) AS total_mb
     FROM dbguard_storage_objects WHERE user_id = ?`,
    [userId]
  );
  return {
    fileCount: parseInt(rows[0].file_count) || 0,
    totalMB:   parseFloat(rows[0].total_mb) || 0,
    totalGB:   (parseFloat(rows[0].total_mb) || 0) / 1024
  };
}

async function checkQuota(userId, fileSizeMB) {
  const plan  = await getClientPlan(userId);
  const usage = await getClientUsage(userId);
  const limitMB  = plan.storage_limit_gb * 1024;
  const maxFiles = plan.max_files;

  if (usage.fileCount >= maxFiles) {
    return {
      allowed: false,
      reason: `Limite de ${maxFiles} arquivo(s) atingido. Delete um arquivo para continuar.`,
      plan, usage
    };
  }
  if (usage.totalMB + fileSizeMB > limitMB) {
    return {
      allowed: false,
      reason: `Limite de ${plan.storage_limit_gb}GB atingido. Libere espaço ou faça upgrade.`,
      plan, usage
    };
  }
  return { allowed: true, plan, usage };
}

async function registerObject(userId, objectName, fileName, fileSizeMB, jobId) {
  await execute(
    `INSERT INTO dbguard_storage_objects (user_id, object_name, file_name, file_size_mb, job_id)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, objectName, fileName, fileSizeMB, jobId || null]
  );
}

async function removeObject(userId, objectId) {
  const { rows } = await execute(
    'SELECT object_name, file_name FROM dbguard_storage_objects WHERE id = ? AND user_id = ?',
    [objectId, userId]
  );
  if (!rows.length) throw new Error('Arquivo não encontrado');
  await deleteObject(rows[0].object_name);
  await execute('DELETE FROM dbguard_storage_objects WHERE id = ?', [objectId]);
  return rows[0];
}

async function listObjects(userId) {
  const { rows } = await execute(
    `SELECT o.id, o.file_name, o.file_size_mb, o.object_name, o.created_at,
            j.status AS job_status, j.job_name
     FROM dbguard_storage_objects o
     LEFT JOIN dbguard_backup_jobs j ON j.id = o.job_id
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`,
    [userId]
  );
  return rows;
}

async function createClientFolder(userId) {
  const markerFile = path.join(os.tmpdir(), `.dbguard_marker_${userId}`);
  fs.writeFileSync(markerFile, `DBGuard client_${userId} folder`);
  try {
    await uploadToOCI(markerFile, `client_${userId}/.folder`);
  } finally {
    if (fs.existsSync(markerFile)) fs.unlinkSync(markerFile);
  }
}

module.exports = {
  getClientPlan,
  getClientUsage,
  checkQuota,
  registerObject,
  removeObject,
  listObjects,
  createClientFolder
};
