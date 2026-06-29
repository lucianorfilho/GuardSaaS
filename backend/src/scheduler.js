const cron = require('node-cron');
const { DateTime } = require('luxon');
const { execute } = require('./config/database');
require('dotenv').config();

console.log('⏰ Scheduler iniciado');

cron.schedule('* * * * *', async () => {
  try {
    const { rows: schedules } = await execute(
      `SELECT sc.*, s.agent_token, s.name AS server_name,
              s.timezone, s.ip_address, u.email AS user_email
       FROM dbguard_schedules sc
       JOIN dbguard_servers s ON s.id = sc.server_id
       JOIN dbguard_users u ON u.id = sc.user_id
       WHERE sc.is_active = 1 AND u.status = 'active'`
    );

    for (const schedule of schedules) {
      const tz = schedule.timezone || 'America/Sao_Paulo';
      const clientNow = DateTime.now().setZone(tz);

      const currentHour    = clientNow.hour;
      const currentMinute  = clientNow.minute;
      const currentWeekday = clientNow.weekday % 7; // luxon: 1=Mon, 7=Sun → 0=Sun
      const currentMonthday = clientNow.day;

      if (schedule.hour !== currentHour || schedule.minute !== currentMinute) continue;

      let shouldRun = false;
      if (schedule.frequency === 'daily') {
        shouldRun = true;
      } else if (schedule.frequency === 'weekly') {
        shouldRun = schedule.weekday === currentWeekday;
      } else if (schedule.frequency === 'monthly') {
        shouldRun = schedule.monthday === currentMonthday;
      }

      if (!shouldRun) continue;

      console.log(`🚀 Disparando backup: ${schedule.name} (${tz} ${clientNow.toFormat('HH:mm')})`);
      await triggerBackup(schedule);
    }
  } catch (err) {
    console.error('Erro no scheduler:', err.message);
  }
});

async function triggerBackup(schedule) {
  try {
    await execute(
      `INSERT INTO dbguard_backup_jobs
         (server_id, user_id, job_name, backup_type, status, started_at)
       VALUES (?, ?, ?, 'files', 'pending', NOW())`,
      [schedule.server_id, schedule.user_id, schedule.name]
    );

    await execute(
      'UPDATE dbguard_schedules SET last_run_at = NOW() WHERE id = ?',
      [schedule.id]
    );

    console.log(`✅ Job criado para: ${schedule.name}`);
  } catch (err) {
    console.error(`❌ Erro ao criar job: ${err.message}`);
  }
}

module.exports = { triggerBackup };
