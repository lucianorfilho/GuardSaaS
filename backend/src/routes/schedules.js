const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { execute } = require('../config/database');

// Listar agendamentos
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await execute(
      `SELECT sc.*, s.name AS server_name, s.os_type
       FROM dbguard_schedules sc
       JOIN dbguard_servers s ON s.id = sc.server_id
       WHERE sc.user_id = ?
       ORDER BY sc.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Criar agendamento
router.post('/', auth, async (req, res) => {
  const {
    server_id, name, source_path, destination,
    frequency, weekday, monthday, hour, minute, retention_days
  } = req.body;

  if (!server_id || !name || !source_path || hour === undefined)
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });

  try {
    // Verificar se servidor pertence ao usuário
    const { rows: servers } = await execute(
      'SELECT id FROM dbguard_servers WHERE id = ? AND user_id = ?',
      [server_id, req.user.id]
    );
    if (!servers.length)
      return res.status(403).json({ error: 'Servidor não encontrado' });

    await execute(
      `INSERT INTO dbguard_schedules
         (server_id, user_id, name, source_path, destination,
          frequency, weekday, monthday, hour, minute, retention_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        server_id, req.user.id, name, source_path,
        destination || 'local', frequency || 'daily',
        weekday ?? null, monthday ?? null,
        hour, minute || 0, retention_days || 30
      ]
    );

    res.status(201).json({ message: 'Agendamento criado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Ativar/desativar agendamento
router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const { rows } = await execute(
      'SELECT id, is_active FROM dbguard_schedules WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ error: 'Agendamento não encontrado' });

    const newStatus = rows[0].is_active ? 0 : 1;
    await execute(
      'UPDATE dbguard_schedules SET is_active = ? WHERE id = ?',
      [newStatus, req.params.id]
    );

    res.json({ is_active: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Deletar agendamento
router.delete('/:id', auth, async (req, res) => {
  try {
    await execute(
      'DELETE FROM dbguard_schedules WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Agendamento removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;

// Atualizar agendamento
router.put('/:id', auth, async (req, res) => {
  const {
    name, source_path, destination,
    frequency, weekday, monthday, hour, minute, retention_days
  } = req.body;

  if (!name || !source_path || hour === undefined)
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });

  try {
    const { rows } = await execute(
      'SELECT id FROM dbguard_schedules WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ error: 'Agendamento não encontrado' });

    await execute(
      `UPDATE dbguard_schedules
       SET name = ?, source_path = ?, destination = ?, frequency = ?,
           weekday = ?, monthday = ?, hour = ?, minute = ?, retention_days = ?
       WHERE id = ? AND user_id = ?`,
      [
        name, source_path, destination || 'local',
        frequency || 'daily',
        weekday ?? null, monthday ?? null,
        hour, minute || 0, retention_days || 30,
        req.params.id, req.user.id
      ]
    );

    res.json({ message: 'Agendamento atualizado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});
