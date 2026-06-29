const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { execute } = require('../config/database');

router.get('/', auth, admin, async (req, res) => {
  try {
    const { rows } = await execute(
      `SELECT u.id, u.name, u.email, u.company, u.status, u.created_at,
              p.name AS plan_name
       FROM dbguard_users u
       LEFT JOIN dbguard_subscriptions s ON s.user_id = u.id AND s.status = 'active'
       LEFT JOIN dbguard_plans p ON p.id = s.plan_id
       WHERE u.role = 'client'
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
