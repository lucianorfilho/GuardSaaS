const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { execute } = require('../config/database');
const { sendEmail } = require('../config/email');
require('dotenv').config();

// Solicitar recuperação
router.post('/forgot', async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ error: 'Email obrigatório' });

  try {
    const { rows } = await execute(
      'SELECT id, name, email FROM dbguard_users WHERE email = ?', [email]
    );

    // Sempre retorna sucesso por segurança
    if (!rows.length)
      return res.json({ message: 'Se o email existir, você receberá as instruções.' });

    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Invalidar tokens anteriores
    await execute(
      'UPDATE dbguard_password_resets SET used = 1 WHERE user_id = ?',
      [user.id]
    );

    // Criar novo token
    await execute(
      'INSERT INTO dbguard_password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expires]
    );

    const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: '🔑 DBGuard — Recuperação de senha',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1e40af;padding:20px;border-radius:8px 8px 0 0">
            <h1 style="color:white;margin:0">DBGuard</h1>
          </div>
          <div style="background:#f8fafc;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
            <h2 style="color:#1e293b">Olá, ${user.name}!</h2>
            <p style="color:#475569">Recebemos uma solicitação para redefinir sua senha.</p>
            <p style="color:#475569">Clique no botão abaixo para criar uma nova senha. Este link expira em <strong>1 hora</strong>.</p>
            <a href="${resetUrl}" style="display:inline-block;margin:20px 0;background:#1e40af;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">
              Redefinir Senha
            </a>
            <p style="color:#94a3b8;font-size:13px">Se você não solicitou isso, ignore este email.</p>
            <p style="color:#94a3b8;font-size:12px;margin-top:10px">Ou copie este link: ${resetUrl}</p>
          </div>
        </div>
      `
    });

    res.json({ message: 'Se o email existir, você receberá as instruções.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Redefinir senha
router.post('/reset', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password)
    return res.status(400).json({ error: 'Token e senha obrigatórios' });

  if (password.length < 8)
    return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });

  try {
    const { rows } = await execute(
      `SELECT r.id, r.user_id, r.expires_at, r.used
       FROM dbguard_password_resets r
       WHERE r.token = ?`,
      [token]
    );

    if (!rows.length)
      return res.status(400).json({ error: 'Link inválido ou expirado' });

    const reset = rows[0];

    if (reset.used)
      return res.status(400).json({ error: 'Este link já foi utilizado' });

    if (new Date() > new Date(reset.expires_at))
      return res.status(400).json({ error: 'Link expirado. Solicite um novo.' });

    const hash = await bcrypt.hash(password, 10);

    await execute(
      'UPDATE dbguard_users SET password_hash = ? WHERE id = ?',
      [hash, reset.user_id]
    );

    await execute(
      'UPDATE dbguard_password_resets SET used = 1 WHERE id = ?',
      [reset.id]
    );

    res.json({ message: 'Senha redefinida com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Validar token (verificar se ainda é válido)
router.get('/validate/:token', async (req, res) => {
  try {
    const { rows } = await execute(
      'SELECT id, expires_at, used FROM dbguard_password_resets WHERE token = ?',
      [req.params.token]
    );

    if (!rows.length || rows[0].used || new Date() > new Date(rows[0].expires_at))
      return res.json({ valid: false });

    res.json({ valid: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
