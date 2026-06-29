const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: `"DBGuard" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
    console.log(`✅ Email enviado para ${to}`);
  } catch (err) {
    console.error('❌ Erro ao enviar email:', err.message);
  }
}

async function notifyNewClient(client) {
  await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: '🔔 DBGuard — Novo cadastro aguardando aprovação',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1e40af;padding:20px;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0">DBGuard</h1>
        </div>
        <div style="background:#f8fafc;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
          <h2 style="color:#1e293b">Novo cliente aguardando aprovação</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;color:#64748b">Nome:</td><td style="padding:8px;font-weight:bold">${client.name}</td></tr>
            <tr><td style="padding:8px;color:#64748b">Email:</td><td style="padding:8px">${client.email}</td></tr>
            <tr><td style="padding:8px;color:#64748b">Empresa:</td><td style="padding:8px">${client.company || '—'}</td></tr>
            <tr><td style="padding:8px;color:#64748b">Telefone:</td><td style="padding:8px">${client.phone || '—'}</td></tr>
          </table>
          <a href="${process.env.APP_URL}/admin" style="display:inline-block;margin-top:20px;background:#1e40af;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">
            Aprovar no Painel Admin
          </a>
        </div>
      </div>
    `
  });
}

async function notifyClientApproved(client) {
  await sendEmail({
    to: client.email,
    subject: '✅ DBGuard — Sua conta foi aprovada!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1e40af;padding:20px;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0">DBGuard</h1>
        </div>
        <div style="background:#f8fafc;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
          <h2 style="color:#1e293b">Olá, ${client.name}!</h2>
          <p style="color:#475569">Sua conta foi aprovada e está pronta para uso.</p>
          <p style="color:#475569">Acesse a plataforma e configure seus primeiros backups:</p>
          <a href="${process.env.APP_URL}/login" style="display:inline-block;margin-top:20px;background:#16a34a;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">
            Acessar DBGuard
          </a>
          <p style="color:#94a3b8;margin-top:20px;font-size:14px">
            Você possui <strong>10GB de storage gratuito</strong> para começar.
          </p>
        </div>
      </div>
    `
  });
}

module.exports = { sendEmail, notifyNewClient, notifyClientApproved };
