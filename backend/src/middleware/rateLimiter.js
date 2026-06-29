const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

// Normaliza IP removendo prefixo IPv6
function getIP(req) {
  const ip = req.ip || req.connection.remoteAddress || '';
  return ip.replace(/^::ffff:/, '');
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getIP,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
  handler: (req, res, next, options) => {
    logger.warn('Rate limit atingido', { ip: getIP(req), path: req.path });
    res.status(429).json(options.message);
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: getIP,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  handler: (req, res, next, options) => {
    logger.warn('Tentativas excessivas de login', { ip: getIP(req), email: req.body?.email });
    res.status(429).json(options.message);
  }
});

const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: getIP,
  message: { error: 'Muitas solicitações de recuperação. Tente novamente em 1 hora.' },
  handler: (req, res, next, options) => {
    logger.warn('Tentativas excessivas de recuperação de senha', { ip: getIP(req) });
    res.status(429).json(options.message);
  }
});

const agentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.body?.token || req.params?.token || getIP(req),
  message: { error: 'Muitas requisições do agente.' },
  handler: (req, res, next, options) => {
    logger.warn('Rate limit do agente atingido', { ip: getIP(req) });
    res.status(429).json(options.message);
  }
});

module.exports = { apiLimiter, loginLimiter, passwordLimiter, agentLimiter };
