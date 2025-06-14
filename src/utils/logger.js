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
    serializers: {
      req(req) {
        const serialized = pino.stdSerializers.req(req);
        if (serialized && serialized.body) {
          const body = { ...serialized.body };
          ['phone', 'address', 'token'].forEach((k) => delete body[k]);
          serialized.body = body;
        }
        return serialized;
      },
      res(res) {
        const serialized = pino.stdSerializers.res(res);
        if (serialized && serialized.headers) {
          const { 'set-cookie': _skip, ...headers } = serialized.headers;
          serialized.headers = headers;
        }
        return serialized;
      },
    },
  },
  transport,
);

function getLogger(filename) {
  const modulePath = path
    .relative(path.join(__dirname, '..'), filename)
    .replace(/\\/g, '/');
  return root.child({ module: modulePath });
}

function createHttpLogger() {
  return pinoHttp({
    logger: root,
    genReqId: (req) => req.headers['x-correlation-id'] || randomUUID(),
    customLogLevel: (res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  });
}

module.exports = { logger: root, getLogger, createHttpLogger };
