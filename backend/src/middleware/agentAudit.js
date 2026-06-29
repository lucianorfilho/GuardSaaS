const logger = require('../config/logger');

module.exports = (req, res, next) => {
  const token = req.body?.token || req.params?.token || 'unknown';
  const tokenPreview = token.length > 8 ? token.substring(0, 8) + '...' : token;

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      type: 'agent_request',
      method: req.method,
      path: req.path,
      ip: req.ip,
      token: tokenPreview,
      status: res.statusCode,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    };

    if (res.statusCode >= 400) {
      logger.warn('Requisição do agente com erro', logData);
    } else {
      logger.info('Requisição do agente', logData);
    }
  });

  next();
};
