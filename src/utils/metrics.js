const client = require('prom-client');

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
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
}

module.exports = { observeRequest, metricsEndpoint };
