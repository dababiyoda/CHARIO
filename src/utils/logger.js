const pino = require('pino');
const path = require('path');
const { trace } = require('@opentelemetry/api');

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
