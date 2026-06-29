const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { execute } = require('../config/database');

router.get('/', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const filter = isAdmin ? '1=1' : 'A.USER_ID = :userId';
  const binds = isAdmin ? {} : { userId: req.user.id };

  try {
    const result = await execute(
      `SELECT A.ID, A.TYPE, A.SEVERITY, A.MESSAGE, A.IS_READ, A.CREATED_AT,
              S.NAME AS SERVER_NAME
       FROM ADMIN.DBGUARD_ALERTS A
       LEFT JOIN ADMIN.DBGUARD_SERVERS S ON S.ID = A.SERVER_ID
       WHERE ${filter}
       ORDER BY A.CREATED_AT DESC
       FETCH FIRST 100 ROWS ONLY`,
      binds
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
