const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const logger = require('../config/logger');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
  handler: (req, res, next, options) => {
    logger.warn('Rate limit atingido', { ip: req.ip, path: req.path });
    res.status(429).json(options.message);
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  handler: (req, res, next, options) => {
    logger.warn('Tentativas excessivas de login', { ip: req.ip });
    res.status(429).json(options.message);
  }
});

const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Muitas solicitações. Tente novamente em 1 hora.' },
  handler: (req, res, next, options) => {
    logger.warn('Tentativas excessivas de recuperação', { ip: req.ip });
    res.status(429).json(options.message);
  }
});

const agentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => {
    const token = req.body?.token || req.params?.token;
    return token ? token.substring(0, 16) : ipKeyGenerator(req.ip);
  },
  message: { error: 'Muitas requisições do agente.' },
  handler: (req, res, next, options) => {
    logger.warn('Rate limit agente', { ip: req.ip });
    res.status(429).json(options.message);
  }
});

module.exports = { apiLimiter, loginLimiter, passwordLimiter, agentLimiter };
