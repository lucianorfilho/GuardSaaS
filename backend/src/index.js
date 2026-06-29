const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { initPool } = require('./config/database');
const logger = require('./config/logger');
const { apiLimiter, loginLimiter, passwordLimiter } = require('./middleware/rateLimiter');

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.use(morgan('combined', {
  stream: { write: msg => logger.info(msg.trim()) }
}));
app.use(express.json());

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/password/forgot', passwordLimiter);

// Rotas
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/password',  require('./routes/password'));
app.use('/api/clients',   require('./routes/clients'));
app.use('/api/backups',   require('./routes/backups'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/alerts',    require('./routes/alerts'));
app.use('/api/servers',   require('./routes/servers'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/agent',     require('./routes/agent'));
app.use('/api/audit',     require('./routes/audit'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: process.env.APP_NAME });
});

const PORT = process.env.PORT || 4000;

initPool().then(() => {
  require('./scheduler');
  app.listen(PORT, () => {
    logger.info(`DBGuard API rodando na porta ${PORT}`);
    console.log(`DBGuard API rodando na porta ${PORT}`);
  });
}).catch(err => {
  logger.error('Falha ao iniciar', { error: err.message });
  process.exit(1);
});
