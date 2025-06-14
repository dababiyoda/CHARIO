const pino = require('pino');
const { stdSerializers } = pino;
const path = require('path');
const { trace } = require('@opentelemetry/api');

function omitFields(obj, fields) {
  if (!obj) return obj;
  const result = { ...obj };
  for (const field of fields) {
    if (field in result) delete result[field];
  }
  return result;
}

const serializers = {
  req(req) {
    const serialized = stdSerializers.req(req);
    if (serialized && serialized.body) {
      serialized.body = omitFields(serialized.body, [
        'phone',
        'address',
        'token',
      ]);
    }
    return serialized;
  },
  res(res) {
    const serialized = stdSerializers.res(res);
    if (serialized && serialized.headers) {
      serialized.headers = omitFields(serialized.headers, ['set-cookie']);
    }
    return serialized;
  },
};

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
    serializers,
    mixin() {
      const span = trace.getActiveSpan();
      if (span) {
        return { traceId: span.spanContext().traceId };
      }
      return {};
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

module.exports = { logger: root, getLogger };
