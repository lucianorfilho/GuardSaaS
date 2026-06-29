const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

async function initPool() {
  if (pool) return;

  pool = mysql.createPool({
    host:     process.env.DB_HOST || 'localhost',
    port:     process.env.DB_PORT || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '-03:00'
  });

  const conn = await pool.getConnection();
  console.log('✅ Conexão com MySQL estabelecida!');
  conn.release();
}

async function execute(sql, binds = []) {
  if (!pool) await initPool();
  const [rows] = await pool.execute(sql, binds);
  return { rows };
}

async function getConnection() {
  if (!pool) await initPool();
  return await pool.getConnection();
}

module.exports = { initPool, execute, getConnection };
