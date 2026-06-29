const cron = require('node-cron');
const { execute } = require('./config/database');
require('dotenv').config();

console.log('⏰ Scheduler iniciado');

// Roda a cada minuto
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const currentHour    = now.getHours();
  const currentMinute  = now.getMinutes();
  const currentWeekday = now.getDay();
  const currentMonthday = now.getDate();

  try {
    const { rows: schedules } = await execute(
      `SELECT sc.*, s.agent_token, s.name AS server_name,
              u.email AS user_email
       FROM dbguard_schedules sc
       JOIN dbguard_servers s ON s.id = sc.server_id
       JOIN dbguard_users u ON u.id = sc.user_id
       WHERE sc.is_active = 1
         AND sc.hour = ?
         AND sc.minute = ?
         AND u.status = 'active'`,
      [currentHour, currentMinute]
    );

    for (const schedule of schedules) {
      let shouldRun = false;

      if (schedule.frequency === 'daily') {
        shouldRun = true;
      } else if (schedule.frequency === 'weekly') {
        shouldRun = schedule.weekday === currentWeekday;
      } else if (schedule.frequency === 'monthly') {
        shouldRun = schedule.monthday === currentMonthday;
      }

      if (shouldRun) {
        await triggerBackup(schedule);
      }
    }
  } catch (err) {
    console.error('Erro no scheduler:', err.message);
  }
});

async function triggerBackup(schedule) {
  console.log(`🚀 Disparando backup: ${schedule.name} (servidor: ${schedule.server_name})`);

  try {
    // Registrar job como pendente
    await execute(
      `INSERT INTO dbguard_backup_jobs
         (server_id, user_id, job_name, backup_type, status, started_at)
       VALUES (?, ?, ?, 'files', 'pending', NOW())`,
      [schedule.server_id, schedule.user_id, schedule.name]
    );

    const { rows } = await execute(
      'SELECT id FROM dbguard_backup_jobs WHERE server_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1',
      [schedule.server_id, 'pending']
    );

    const jobId = rows[0]?.id;

    // Notificar agente via HTTP
    const agentUrl = `http://${schedule.server_ip || 'agent'}:8765/backup`;
    const payload = {
      job_id:         jobId,
      schedule_id:    schedule.id,
      source_path:    schedule.source_path,
      destination:    schedule.destination,
      retention_days: schedule.retention_days,
      server_url:     process.env.APP_URL,
      token:          schedule.agent_token
    };

    // Atualizar status para running
    await execute(
      "UPDATE dbguard_backup_jobs SET status = 'running' WHERE id = ?",
      [jobId]
    );

    console.log(`✅ Job ${jobId} criado para ${schedule.name}`);

    // Atualizar last_run_at do schedule
    await execute(
      'UPDATE dbguard_schedules SET last_run_at = NOW() WHERE id = ?',
      [schedule.id]
    );

  } catch (err) {
    console.error(`❌ Erro ao disparar backup ${schedule.name}:`, err.message);
  }
}

module.exports = { triggerBackup };
