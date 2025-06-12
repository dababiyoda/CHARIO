const client = require('prom-client');
const auth = require('basic-auth');
const { config } = require('../config/env');
const { getLogger } = require('./logger');

const log = getLogger(__filename);

client.collectDefaultMetrics();

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const failedRides = new client.Counter({
  name: 'failed_rides_total',
  help: 'Total number of failed ride operations'
});

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

async function metricsEndpoint(req, res) {
  const credentials = auth(req);
  if (!credentials || credentials.name !== config.METRICS_USER || credentials.pass !== config.METRICS_PASS) {
    res.set('WWW-Authenticate', 'Basic');
    return res.status(401).send('authentication required');
  }
  log.debug('Serving metrics');
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
}

module.exports = { observeRequest, metricsEndpoint };
