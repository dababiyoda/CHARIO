const client = require('prom-client');
const auth = require('basic-auth');
const { config } = require('../config/env');
const { getLogger } = require('./logger');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const {
  OTLPTraceExporter,
} = require('@opentelemetry/exporter-trace-otlp-http');
const {
  getNodeAutoInstrumentations,
} = require('@opentelemetry/auto-instrumentations-node');
const { PrismaInstrumentation } = require('@prisma/instrumentation');
let StripeInstrumentation;
try {
  ({
    StripeInstrumentation,
  } = require('@opentelemetry/instrumentation-stripe'));
} catch (_) {
  StripeInstrumentation = null;
}

const log = getLogger(__filename);

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

const failedRides = new client.Counter({
  name: 'failed_rides_total',
  help: 'Total number of failed ride operations',
});

let tracingStarted = false;

function initTracing() {
  if (tracingStarted) return;
  tracingStarted = true;
  const exporter = new OTLPTraceExporter({
    url:
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
      'http://localhost:4318/v1/traces',
  });
  const inst = [getNodeAutoInstrumentations(), new PrismaInstrumentation()];
  if (StripeInstrumentation) {
    inst.push(new StripeInstrumentation());
  }
  const sdk = new NodeSDK({
    traceExporter: exporter,
    instrumentations: inst,
  });
  sdk
    .start()
    .then(() => {
      log.info('OpenTelemetry tracing initialized');
    })
    .catch((err) => {
      log.error({ err }, 'Failed to start OpenTelemetry');
    });
}

function observeRequest(req, res, next) {
  const end = httpRequestDuration.startTimer({ method: req.method });
  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    end({ route, status_code: res.statusCode });
    if (res.statusCode >= 400 && route.startsWith('/rides')) {
      failedRides.inc();
    }
  });
  next();
}

module.exports = { observeRequest, initTracing };
