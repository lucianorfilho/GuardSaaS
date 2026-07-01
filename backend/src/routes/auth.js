const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { execute } = require('../config/database');
const { notifyNewClient } = require('../config/email');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email e senha obrigatórios' });

  try {
    const { rows } = await execute(
      'SELECT id, name, email, password_hash, role, status FROM dbguard_users WHERE email = ?',
      [email]
    );

    if (!rows.length)
      return res.status(401).json({ error: 'Credenciais inválidas' });

    const user = rows[0];

    if (user.status === 'pending')
      return res.status(403).json({ error: 'Conta aguardando aprovação do administrador. Verifique seu email para atualizações.' });

    if (user.status === 'inactive')
      return res.status(403).json({ error: 'Conta inativada. Entre em contato com o administrador.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/register', async (req, res) => {
  const { name, email, password, phone, company } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nome, email e senha obrigatórios' });

  try {
    const { rows } = await execute(
      'SELECT id FROM dbguard_users WHERE email = ?', [email]
    );
    if (rows.length)
      return res.status(409).json({ error: 'Email já cadastrado' });

    const hash = await bcrypt.hash(password, 10);
    await execute(
      `INSERT INTO dbguard_users (name, email, password_hash, phone, company, status, role)
       VALUES (?, ?, ?, ?, ?, 'pending', 'client')`,
      [name, email, hash, phone || null, company || null]
    );

    // Notificar admin
    notifyNewClient({ name, email, phone, company });

    res.status(201).json({ message: 'Cadastro realizado! Aguarde a aprovação do administrador.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const { rows } = await execute(
      'SELECT id, name, email, role, status, phone, company, created_at FROM dbguard_users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
