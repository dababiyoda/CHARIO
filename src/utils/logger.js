const pino = require('pino');
const pinoHttp = require('pino-http');
const { randomUUID } = require('crypto');
const path = require('path');

const transport =
  process.env.NODE_ENV === 'production'
    ? undefined
    : pino.transport({ target: 'pino-pretty' });

const root = pino(
  {
    level: 'info',
    redact: {
      paths: ['PATIENT_DATA_KEY'],
      censor: '[REDACTED]',
    },
  },
  transport,
);

const httpLogger = pinoHttp({
  logger: root,
  level: 'info',
  genReqId: (req) => req.headers['x-correlation-id'] || randomUUID(),
  serializers: {
    req(req) {
      const result = pino.stdSerializers.req(req);
      if (req.body && typeof req.body === 'object') {
        const { phone, address, token, ...rest } = req.body;
        result.body = rest;
      }
      return result;
    },
    res(res) {
      const result = pino.stdSerializers.res(res);
      if (result && result.headers) {
        const { 'set-cookie': _discard, ...headers } = result.headers;
        result.headers = headers;
      }
      return result;
    },
  },
  customLogLevel(res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});

function getLogger(filename) {
  const modulePath = path
    .relative(path.join(__dirname, '..'), filename)
    .replace(/\\/g, '/');
  return root.child({ module: modulePath });
}

module.exports = { logger: root, getLogger, httpLogger };
