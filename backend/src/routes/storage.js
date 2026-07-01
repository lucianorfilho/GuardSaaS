const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getClientPlan, getClientUsage, listObjects, removeObject } = require('../services/storageQuota');

// Informações de quota e uso
router.get('/quota', auth, async (req, res) => {
  try {
    const [plan, usage] = await Promise.all([
      getClientPlan(req.user.id),
      getClientUsage(req.user.id)
    ]);

    const limitMB    = plan.storage_limit_gb * 1024;
    const usedPct    = limitMB > 0 ? (usage.totalMB / limitMB) * 100 : 0;

    res.json({
      plan,
      usage,
      limits: {
        storage_gb:  plan.storage_limit_gb,
        storage_mb:  limitMB,
        max_files:   plan.max_files,
        used_pct:    Math.min(usedPct, 100).toFixed(1)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Listar arquivos
router.get('/files', auth, async (req, res) => {
  try {
    const objects = await listObjects(req.user.id);
    res.json(objects);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Deletar arquivo
router.delete('/files/:id', auth, async (req, res) => {
  try {
    const removed = await removeObject(req.user.id, req.params.id);
    res.json({ message: `Arquivo ${removed.file_name} removido com sucesso` });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro interno' });
  }
});

module.exports = router;
