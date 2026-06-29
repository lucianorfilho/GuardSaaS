require('dotenv').config();
const oracledb = require('oracledb');

async function test() {
  console.log('Iniciando teste...');
  console.log('TNS_ADMIN:', process.env.TNS_ADMIN);
  console.log('DB_USER:', process.env.DB_USER);
  console.log('DB_CONNECTION_STRING:', process.env.DB_CONNECTION_STRING);

  try {
    const conn = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionString: process.env.DB_CONNECTION_STRING,
      configDir: process.env.TNS_ADMIN,
      walletLocation: process.env.TNS_ADMIN,
      walletPassword: process.env.DB_WALLET_PASSWORD || ''
    });

    console.log('✅ Conectado com sucesso!');
    const result = await conn.execute('SELECT 1 FROM DUAL');
    console.log('✅ Query OK:', result.rows);
    await conn.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.error('Código:', err.code);
    process.exit(1);
  }
}

// Timeout manual de 20 segundos
setTimeout(() => {
  console.error('❌ Timeout manual — conexão não respondeu em 20s');
  process.exit(1);
}, 20000);

test();
