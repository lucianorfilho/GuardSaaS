const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { initPool } = require('./config/database');
const app = express();

app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/password',  require('./routes/password'));
app.use('/api/clients',   require('./routes/clients'));
app.use('/api/backups',   require('./routes/backups'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/alerts',    require('./routes/alerts'));
app.use('/api/servers',   require('./routes/servers'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/agent',     require('./routes/agent'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: process.env.APP_NAME });
});

const PORT = process.env.PORT || 4000;

initPool().then(() => {
  require('./scheduler');
  app.listen(PORT, () => {
    console.log(`DBGuard API rodando na porta ${PORT}`);
  });
}).catch(err => {
  console.error('Falha ao iniciar:', err);
  process.exit(1);
});
