const cron = require('node-cron');
const { DateTime } = require('luxon');
const { execute } = require('./config/database');
const { notifyPlanExpiring, notifyPlanExpired } = require('./config/email');
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

// Verificar vencimento de planos — roda todos os dias à meia-noite
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('🔔 Verificando vencimento de planos...');
    const now = DateTime.now().toJSDate();
    const threeDaysFromNow = DateTime.now().plus({ days: 3 }).toJSDate();
    const threeDaysAgo = DateTime.now().minus({ days: 3 }).toJSDate();

    // 1. Avisar clientes que plano vence em 3 dias
    const { rows: expiringSoon } = await execute(
      `SELECT s.id, s.user_id, s.expires_at, u.name, u.email, p.name AS plan_name
       FROM dbguard_subscriptions s
       JOIN dbguard_users u ON u.id = s.user_id
       JOIN dbguard_plans p ON p.id = s.plan_id
       WHERE s.status = 'active'
       AND s.expires_at IS NOT NULL
       AND DATE(s.expires_at) = DATE(?)
       AND s.warned_at IS NULL`,
      [threeDaysFromNow]
    );

    for (const sub of expiringSoon) {
      try {
        // Enviar email de aviso
        if (notifyPlanExpiring) {
          notifyPlanExpiring({ email: sub.email, name: sub.name, plan: sub.plan_name, expires_at: sub.expires_at });
        }
        // Marcar como avisado
        await execute('UPDATE dbguard_subscriptions SET warned_at = NOW() WHERE id = ?', [sub.id]);
        console.log(`📧 Aviso de vencimento enviado para ${sub.email}`);
      } catch (err) {
        console.error(`Erro ao notificar ${sub.email}:`, err.message);
      }
    }

    // 2. Inativar contas que venceram há 3+ dias (período de graça expirou)
    const { rows: expiredAccounts } = await execute(
      `SELECT s.id, s.user_id, u.name, u.email
       FROM dbguard_subscriptions s
       JOIN dbguard_users u ON u.id = s.user_id
       WHERE s.status = 'active'
       AND s.expires_at IS NOT NULL
       AND s.expires_at <= ?
       AND (s.grace_until IS NULL OR s.grace_until <= ?)`,
      [threeDaysAgo, now]
    );

    for (const sub of expiredAccounts) {
      try {
        // Inativar conta
        await execute("UPDATE dbguard_users SET status = 'inactive' WHERE id = ?", [sub.user_id]);
        // Marcar assinatura como expirada
        await execute("UPDATE dbguard_subscriptions SET status = 'expired' WHERE id = ?", [sub.id]);

        // Enviar email notificando
        if (notifyPlanExpired) {
          notifyPlanExpired({ email: sub.email, name: sub.name });
        }

        console.log(`🚫 Conta inativada por vencimento: ${sub.email}`);
      } catch (err) {
        console.error(`Erro ao inativar ${sub.email}:`, err.message);
      }
    }

    console.log('✅ Verificação de vencimento concluída');
  } catch (err) {
    console.error('Erro no scheduler de vencimento:', err.message);
  }
});

module.exports = { triggerBackup };
