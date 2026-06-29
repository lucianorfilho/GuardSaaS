const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { execute } = require('../config/database');

router.get('/', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const filter = isAdmin ? '1=1' : 'USER_ID = :userId';
  const binds = isAdmin ? {} : { userId: req.user.id };

  try {
    const result = await execute(
      `SELECT ID, NAME, HOSTNAME, IP_ADDRESS, OS_TYPE,
              AGENT_VERSION, STATUS, LAST_SEEN_AT, CREATED_AT
       FROM ADMIN.DBGUARD_SERVERS
       WHERE ${filter}
       ORDER BY CREATED_AT DESC`,
      binds
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
