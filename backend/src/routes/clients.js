const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { execute } = require('../config/database');

// Listar clientes (admin)
router.get('/', auth, admin, async (req, res) => {
  try {
    const result = await execute(
      `SELECT U.ID, U.NAME, U.EMAIL, U.COMPANY, U.STATUS, U.CREATED_AT,
              P.NAME AS PLAN_NAME
       FROM DBGUARD_USERS U
       LEFT JOIN DBGUARD_SUBSCRIPTIONS S ON S.USER_ID = U.ID AND S.STATUS = 'active'
       LEFT JOIN DBGUARD_PLANS P ON P.ID = S.PLAN_ID
       WHERE U.ROLE = 'client'
       ORDER BY U.CREATED_AT DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
