const oracledb = require('oracledb');
require('dotenv').config();

let poolCreated = false;

async function initPool() {
  if (poolCreated) return;

  // Define o diretório do wallet/tnsnames antes de qualquer conexão
  process.env.TNS_ADMIN = process.env.TNS_ADMIN || process.env.ORACLE_WALLET_PATH;

  await oracledb.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionString: process.env.DB_CONNECTION_STRING,
    walletLocation: process.env.TNS_ADMIN,
    walletPassword: process.env.DB_WALLET_PASSWORD || '',
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 1
  });

  poolCreated = true;
  console.log('✅ Pool de conexões Oracle criado!');
}

async function getConnection() {
  if (!poolCreated) await initPool();
  return await oracledb.getConnection();
}

async function execute(sql, binds = [], opts = {}) {
  let conn;
  try {
    conn = await getConnection();
    const options = { outFormat: oracledb.OUT_FORMAT_OBJECT, autoCommit: true, ...opts };
    const result = await conn.execute(sql, binds, options);
    return result;
  } finally {
    if (conn) await conn.close();
  }
}

module.exports = { initPool, getConnection, execute };
