const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { prisma } = require('./utils/db');
const pinoHttp = require('pino-http');
const { getLogger } = require('./utils/logger');
const { randomUUID, createHash } = require('crypto');
const { observeRequest, metricsEndpoint } = require('./utils/metrics');
const { config } = require('./config/env');
const stripe = require('stripe')(config.STRIPE_KEY);
const { payoutDriver } = require('./modules/payments/payouts');
const createWebhookRouter = require('./modules/payments/routes');
const createInsuranceRouter = require('./modules/insurance/routes');
const { authenticate, issueToken } = require('./modules/auth/service');
const { sendSMS } = require('./modules/rides/service');
const cron = require('node-cron');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { logAudit } = require('./utils/audit');
const audit = require('./utils/middleware/audit');
const {
  validate,
  bookRideSchema,
  loginSchema,
  signupSchema,
  ridesQuerySchema,
  idSchema
} = require('./utils/middleware/validate');

const app = express();
const httpLogger = pinoHttp({
  genReqId: (req) => req.headers['x-correlation-id'] || randomUUID()
});
const log = getLogger(__filename);
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
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
app.use(limiter);
app.use(express.static('public'));

// Simple health endpoint for containers
app.get('/healthz', (req, res) => res.send('ok'));
app.get('/health', async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  await stripe.balance.retrieve().catch(() => null);
  res.json({ db: 'ok', stripe: 'ok', version: process.pkg.version });
});
app.get('/metrics', metricsEndpoint);


// HTTP and Socket.io server setup
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  socket.on('join_drivers', () => {
    socket.join('drivers');
  });
});

app.use(createWebhookRouter(io));
app.use(express.json());
app.use(audit);
app.use(createInsuranceRouter());

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
    const { pickup_time, pickup_address, dropoff_address, payment_type } = req.validated.body;

    const pickupTime = new Date(pickup_time);

    const ride = await prisma.ride.create({
      data: {
        pickup_time: pickupTime,
        pickup_address,
        dropoff_address,
        payment_type,
        status: 'pending'
      }
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

// GET /rides handler
app.get('/rides', authenticate, validate(ridesQuerySchema), async (req, res) => {
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
    if (driver_id) whereClause.driver_id = driver_id === 'me' ? req.user.id : driver_id;
    if (patient_id) whereClause.patient_id = patient_id === 'me' ? req.user.id : patient_id;
    const rides = await prisma.ride.findMany({
      where: whereClause,
      orderBy: { pickup_time: 'asc' }
    });
    await logAudit(req.user.id, 'GET /rides');
    return res.json(rides);
  } catch (err) {
    log.error({ err }, 'Failed to fetch rides');
    return res.status(500).json({ error: 'internal server error' });
  }
});

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
      select: { driver_id: true }
    });
    if (!rideCheck) {
      return res.status(404).json({ error: 'ride not found' });
    }
    if (rideCheck.driver_id) {
      return res.status(409).json({ error: 'ride already assigned' });
    }
    const updated = await prisma.ride.update({
      where: { id },
      data: { driver_id: req.user.id, status: 'confirmed' }
    });
    await logAudit(req.user.id, `PUT /rides/${id}/assign`);
    return res.json(updated);
  } catch (err) {
    log.error({ err }, 'Failed to assign ride');
    return res.status(500).json({ error: 'internal server error' });
  }
});

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
      select: { driver_id: true, status: true }
    });
    if (!ride) {
      return res.status(404).json({ error: 'ride not found' });
    }

    if (ride.driver_id !== req.user.id) {
      return res.status(403).json({ error: 'only assigned driver can complete ride' });
    }

    if (ride.status === 'completed') {
      return res.status(409).json({ error: 'ride already completed' });
    }

    const updated = await prisma.ride.update({
      where: { id },
      data: { status: 'completed', completed_at: new Date() }
    });

    payoutDriver(req.user.id, id);
    await logAudit(req.user.id, `PUT /rides/${id}/complete`);

    return res.json(updated);
  } catch (err) {
    log.error({ err }, 'Failed to complete ride');
    return res.status(500).json({ error: 'internal server error' });
  }
});

// Cron job: send reminders for rides happening in 24 hours
function scheduleReminders() {
  cron.schedule('0 * * * *', async () => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    try {
      const rides = await prisma.ride.findMany({
        where: {
          status: 'confirmed',
          pickup_time: { gte: in24h, lt: in25h }
        },
        include: {
          patient: { select: { phone: true } },
          driver: { select: { phone: true } }
        }
      });
      for (const ride of rides) {
        const timeStr = new Date(ride.pickup_time).toLocaleString();
        await sendSMS(ride.patient.phone, `Reminder: your ride is scheduled for ${timeStr}.`);
        await sendSMS(ride.driver.phone, `Reminder: you have a ride scheduled for ${timeStr}.`);
      }
    } catch (err) {
      log.error({ err }, 'Failed to send ride reminders');
    }
  });
}

module.exports = { app, server, prisma, io, scheduleReminders };
