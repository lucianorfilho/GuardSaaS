const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { execute } = require('../config/database');

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email e senha obrigatórios' });

  try {
    const result = await execute(
      `SELECT ID, NAME, EMAIL, PASSWORD_HASH, ROLE, STATUS
       FROM DBGUARD_USERS WHERE EMAIL = :email`,
      { email }
    );

    if (!result.rows.length)
      return res.status(401).json({ error: 'Credenciais inválidas' });

    const user = result.rows[0];

    if (user.STATUS !== 'active')
      return res.status(403).json({ error: 'Conta inativa ou suspensa' });

    const valid = await bcrypt.compare(password, user.PASSWORD_HASH);
    if (!valid)
      return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign(
      { id: user.ID, name: user.NAME, email: user.EMAIL, role: user.ROLE },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.ID, name: user.NAME, email: user.EMAIL, role: user.ROLE } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Registrar cliente
router.post('/register', async (req, res) => {
  const { name, email, password, phone, company } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nome, email e senha obrigatórios' });

  try {
    const exists = await execute(
      'SELECT ID FROM DBGUARD_USERS WHERE EMAIL = :email', { email }
    );
    if (exists.rows.length)
      return res.status(409).json({ error: 'Email já cadastrado' });

    const hash = await bcrypt.hash(password, 10);
    await execute(
      `INSERT INTO DBGUARD_USERS (NAME, EMAIL, PASSWORD_HASH, PHONE, COMPANY)
       VALUES (:name, :email, :hash, :phone, :company)`,
      { name, email, hash, phone: phone || null, company: company || null }
    );

    res.status(201).json({ message: 'Conta criada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Perfil autenticado
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const result = await execute(
      `SELECT ID, NAME, EMAIL, ROLE, STATUS, PHONE, COMPANY, CREATED_AT
       FROM DBGUARD_USERS WHERE ID = :id`,
      { id: req.user.id }
    );
    if (!result.rows.length)
      return res.status(404).json({ error: 'Usuário não encontrado' });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
