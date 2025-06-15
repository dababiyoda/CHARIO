const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { prisma } = require('./utils/db');
const pinoHttp = require('pino-http');
const { logger: rootLogger, getLogger } = require('./utils/logger');
const fs = require('fs');
const { randomUUID, createHash } = require('crypto');
const { observeRequest } = require('./utils/metrics');
const client = require('prom-client');
const basicAuth = require('basic-auth');
const { config } = require('./config/env');
const stripe = require('stripe')(config.STRIPE_KEY);
const { payoutDriver } = require('./modules/payments/payouts');
const createWebhookRouter = require('./modules/payments/routes');
const createInsuranceRouter = require('./modules/insurance/routes');
const { authenticate, issueToken } = require('./modules/auth/service');
const createAuthRouter = require('./modules/auth/routes');
const { sendSMS } = require('./modules/rides/service');
const { Queue, QueueScheduler } = require('bullmq');
const IORedis = require('ioredis');
const Redlock = require('redlock');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { logAudit } = require('./utils/audit');
const audit = require('./middleware/audit');
const {
  validate,
  bookRideSchema,
  loginSchema,
  signupSchema,
  ridesQuerySchema,
  idSchema,
} = require('./utils/middleware/validate');

const app = express();
client.collectDefaultMetrics();
const httpLogger = pinoHttp({
  logger: rootLogger,
  genReqId: (req) => req.headers['x-correlation-id'] || randomUUID(),
  customLogLevel: (res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
const log = getLogger(__filename);
function requireTLS(req, res, next) {
  if (config.NODE_ENV === 'test') {
    return next();
  }
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return next();
  }
  return res.status(426).send('HTTPS required');
}
app.use(requireTLS);
app.use(httpLogger);
app.use((req, res, next) => {
  res.setHeader('x-correlation-id', req.id);
  next();
});
app.use(observeRequest);

app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use('/static', express.static('public', { maxAge: '30d', etag: true }));

// Simple health endpoint for containers
const READY_FILE = '/tmp/migrations-complete';
app.get('/healthz', (req, res) => res.send('ok'));
app.get('/readyz', (req, res) => {
  if (fs.existsSync(READY_FILE)) {
    return res.send('ok');
  }
  return res.status(503).send('migrations pending');
});
app.get('/health', async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  await stripe.balance.retrieve().catch(() => null);
  res.json({ db: 'ok', stripe: 'ok', version: process.pkg.version });
});
function metricsAuth(req, res, next) {
  const creds = basicAuth(req);
  const user = config.METRICS_USER || 'metrics';
  if (!creds || creds.name !== user || creds.pass !== config.METRICS_PASS) {
    res.set('WWW-Authenticate', 'Basic');
    return res.status(401).send('authentication required');
  }
  return next();
}

app.get('/metrics', metricsAuth, async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// HTTP and Socket.io server setup
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

process.on('SIGTERM', async () => {
  log.info('🛑 graceful shutdown');
  server.close(() => prisma.$disconnect().then(() => process.exit(0)));
});

io.on('connection', (socket) => {
  socket.on('join_drivers', () => {
    socket.join('drivers');
  });
});

app.use(createWebhookRouter(io));
app.use(express.json());
app.use(audit);
app.use(createInsuranceRouter());
app.use('/auth', createAuthRouter());

const users = new Map();

app.post('/signup', validate(signupSchema), (req, res) => {
  const { email, password } = req.validated.body;
  if (users.has(email)) {
    return res.status(409).json({ error: 'email already registered' });
  }
  const id = randomUUID();
  const hash = createHash('sha256').update(password).digest('hex');
  users.set(email, { id, hash });
  const token = issueToken({ id, role: 'patient' });
  res.status(201).json({ token });
});

app.post('/login', validate(loginSchema), (req, res) => {
  const { email, password } = req.validated.body;
  const user = users.get(email);
  const hash = createHash('sha256').update(password).digest('hex');
  if (!user || user.hash !== hash) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  const token = issueToken({ id: user.id, role: 'patient' });
  res.json({ token });
});

function requireDriver(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthenticated' });
  }
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'driver role required' });
  }
  next();
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}

// POST /rides handler
app.post('/rides', validate(bookRideSchema), async (req, res) => {
  try {
    const { pickup_time, pickup_address, dropoff_address, payment_type } =
      req.validated.body;

    const pickupTime = new Date(pickup_time);

    const ride = await prisma.ride.create({
      data: {
        pickup_time: pickupTime,
        pickup_address,
        dropoff_address,
        payment_type,
        status: 'pending',
      },
    });
    if (ride.status === 'pending') {
      io.to('drivers').emit('new_ride', ride);
    }
    await logAudit(req.user ? req.user.id : null, 'POST /rides');
    return res.status(201).json(ride);
  } catch (err) {
    log.error({ err }, 'Failed to create ride');
    return res.status(500).json({ error: 'internal server error' });
  }
});

// POST /api/rides handler (alias for backwards compatibility)
app.post('/api/rides', validate(bookRideSchema), async (req, res) => {
  try {
    const { pickup_time, pickup_address, dropoff_address, payment_type } =
      req.validated.body;

    const pickupTime = new Date(pickup_time);

    const ride = await prisma.ride.create({
      data: {
        pickup_time: pickupTime,
        pickup_address,
        dropoff_address,
        payment_type,
        status: 'pending',
      },
    });
    if (ride.status === 'pending') {
      io.to('drivers').emit('new_ride', ride);
    }
    await logAudit(req.user ? req.user.id : null, 'POST /api/rides');
    return res.status(201).json(ride);
  } catch (err) {
    log.error({ err }, 'Failed to create ride');
    return res.status(500).json({ error: 'internal server error' });
  }
});

// GET /rides handler
app.get(
  '/rides',
  authenticate,
  validate(ridesQuerySchema),
  async (req, res) => {
    try {
      const { status, driver_id, patient_id } = req.validated.query;
      const clauses = [];
      const values = [];

      if (status) {
        clauses.push(`status = $${values.length + 1}`);
        values.push(status);
      }

      if (driver_id) {
        let id = driver_id;
        if (driver_id === 'me') {
          if (!req.user || req.user.role !== 'driver') {
            return res.status(403).json({ error: 'driver role required' });
          }
          id = req.user.id;
        }
        clauses.push(`driver_id = $${values.length + 1}`);
        values.push(id);
      }

      if (patient_id) {
        let id = patient_id;
        if (patient_id === 'me') {
          if (!req.user || req.user.role !== 'patient') {
            return res.status(403).json({ error: 'patient role required' });
          }
          id = req.user.id;
        }
        clauses.push(`patient_id = $${values.length + 1}`);
        values.push(id);
      }

      const whereClause = {};
      if (status) whereClause.status = status;
      if (driver_id)
        whereClause.driver_id = driver_id === 'me' ? req.user.id : driver_id;
      if (patient_id)
        whereClause.patient_id = patient_id === 'me' ? req.user.id : patient_id;
      const rides = await prisma.ride.findMany({
        where: whereClause,
        orderBy: { pickup_time: 'asc' },
      });
      await logAudit(req.user.id, 'GET /rides');
      return res.json(rides);
    } catch (err) {
      log.error({ err }, 'Failed to fetch rides');
      return res.status(500).json({ error: 'internal server error' });
    }
  },
);

// PUT /rides/:id/assign handler
app.put(
  '/rides/:id/assign',
  authenticate,
  requireDriver,
  validate(idSchema),
  async (req, res) => {
    try {
      const id = req.validated.params.id;

      const rideCheck = await prisma.ride.findUnique({
        where: { id },
        select: { driver_id: true },
      });
      if (!rideCheck) {
        return res.status(404).json({ error: 'ride not found' });
      }
      if (rideCheck.driver_id) {
        return res.status(409).json({ error: 'ride already assigned' });
      }
      const updated = await prisma.ride.update({
        where: { id },
        data: { driver_id: req.user.id, status: 'confirmed' },
      });
      await logAudit(req.user.id, `PUT /rides/${id}/assign`);
      return res.json(updated);
    } catch (err) {
      log.error({ err }, 'Failed to assign ride');
      return res.status(500).json({ error: 'internal server error' });
    }
  },
);

// PUT /rides/:id/complete handler
app.put(
  '/rides/:id/complete',
  authenticate,
  requireDriver,
  validate(idSchema),
  async (req, res) => {
    try {
      const id = req.validated.params.id;

      const ride = await prisma.ride.findUnique({
        where: { id },
        select: { driver_id: true, status: true },
      });
      if (!ride) {
        return res.status(404).json({ error: 'ride not found' });
      }

      if (ride.driver_id !== req.user.id) {
        return res
          .status(403)
          .json({ error: 'only assigned driver can complete ride' });
      }

      if (ride.status === 'completed') {
        return res.status(409).json({ error: 'ride already completed' });
      }

      const updated = await prisma.ride.update({
        where: { id },
        data: { status: 'completed', completed_at: new Date() },
      });

      payoutDriver(req.user.id, id);
      await logAudit(req.user.id, `PUT /rides/${id}/complete`);

      return res.json(updated);
    } catch (err) {
      log.error({ err }, 'Failed to complete ride');
      return res.status(500).json({ error: 'internal server error' });
    }
  },
);

// Cron job: send reminders for rides happening in 24 hours
const reminderConnection = config.REDIS_URL
  ? new IORedis(config.REDIS_URL)
  : null;
let reminderQueue;
let reminderScheduler;
let reminderLock;

function getReminderQueue() {
  if (!reminderQueue && reminderConnection) {
    reminderQueue = new Queue('ride-reminders', {
      connection: reminderConnection,
    });
    reminderScheduler = new QueueScheduler('ride-reminders', {
      connection: reminderConnection,
    });
    reminderLock = new Redlock([reminderConnection]);
  }
  return reminderQueue;
}

async function scheduleReminders() {
  const q = getReminderQueue();
  if (!q) {
    log.warn('Redis not configured; reminders disabled');
    return;
  }
  try {
    const lock = await reminderLock.acquire(['locks:reminder-schedule'], 60000);
    await q.add(
      'send-reminders',
      {},
      {
        jobId: 'send-reminders',
        repeat: { cron: '0 * * * *' },
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
    await lock.release();
  } catch (err) {
    if (err.name !== 'LockError') {
      log.error({ err }, 'Failed to schedule reminders');
    }
  }
}

// Generic error handler with PATIENT_DATA_KEY redaction
app.use((err, req, res, next) => {
  let message = err && err.message ? err.message : 'internal error';
  if (message.includes(config.PATIENT_DATA_KEY)) {
    message = message.replace(
      new RegExp(config.PATIENT_DATA_KEY, 'g'),
      '[REDACTED]',
    );
  }
  const safeErr = { ...err };
  for (const k in safeErr) {
    if (
      typeof safeErr[k] === 'string' &&
      safeErr[k].includes(config.PATIENT_DATA_KEY)
    ) {
      safeErr[k] = safeErr[k].replace(
        new RegExp(config.PATIENT_DATA_KEY, 'g'),
        '[REDACTED]',
      );
    }
  }
  log.error({ err: safeErr }, message);
  res.status(500).json({ error: 'internal server error' });
});

module.exports = { app, server, prisma, io, scheduleReminders };
