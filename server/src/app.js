const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const pinoHttp = require('pino-http');
const { randomUUID, createHash } = require('crypto');
const { observeRequest, metricsEndpoint } = require('./metrics');
let pool;
const { config } = require('../../src/config/env');
const { payoutDriver } = require('./payments/payouts');
const createWebhookRouter = require('./payments/webhook');
const { authenticate } = require('./auth');
const { sendSMS } = require('./rides/sms');
const cron = require('node-cron');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { logAudit } = require('./audit');
const {
  validate,
  bookRideSchema,
  loginSchema,
  signupSchema,
  ridesQuerySchema,
  idSchema
} = require('./middleware/validate');
const { issueToken } = require('./auth');

const app = express();
const logger = pinoHttp({
  genReqId: (req) => req.headers['x-correlation-id'] || randomUUID()
});
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
app.use(logger);
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
app.get('/metrics', metricsEndpoint);


// HTTP and Socket.io server setup
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  socket.on('join_drivers', () => {
    socket.join('drivers');
  });
});

pool = new Pool();
app.use(createWebhookRouter(io));
app.use(express.json());

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

    const insertQuery = `
      INSERT INTO rides (pickup_time, pickup_address, dropoff_address, payment_type, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `;

    const { rows } = await pool.query(insertQuery, [pickupTime.toISOString(), pickup_address, dropoff_address, payment_type]);
    if (rows[0] && rows[0].status === 'pending') {
      io.to('drivers').emit('new_ride', rows[0]);
    }
    await logAudit(req.user ? req.user.id : null, 'POST /rides');
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Failed to create ride', err);
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

    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    const query = `SELECT * FROM rides${where} ORDER BY pickup_time`;
    const { rows } = await pool.query(query, values);
    await logAudit(req.user.id, 'GET /rides');
    return res.json(rows);
  } catch (err) {
    console.error('Failed to fetch rides', err);
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

    // fetch ride to check if already assigned
    const { rows } = await pool.query('SELECT driver_id FROM rides WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'ride not found' });
    }
    if (rows[0].driver_id) {
      return res.status(409).json({ error: 'ride already assigned' });
    }

    const updateQuery = `UPDATE rides SET driver_id = $1, status = 'confirmed' WHERE id = $2 RETURNING *`;
    const { rows: updated } = await pool.query(updateQuery, [req.user.id, id]);
    await logAudit(req.user.id, `PUT /rides/${id}/assign`);
    return res.json(updated[0]);
  } catch (err) {
    console.error('Failed to assign ride', err);
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

    const { rows } = await pool.query(
      'SELECT driver_id, status FROM rides WHERE id = $1',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'ride not found' });
    }

    const ride = rows[0];

    if (ride.driver_id !== req.user.id) {
      return res.status(403).json({ error: 'only assigned driver can complete ride' });
    }

    if (ride.status === 'completed') {
      return res.status(409).json({ error: 'ride already completed' });
    }

    const updateQuery = `
      UPDATE rides
      SET status = 'completed', completed_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const { rows: updated } = await pool.query(updateQuery, [id]);

    payoutDriver(req.user.id, id);
    await logAudit(req.user.id, `PUT /rides/${id}/complete`);

    return res.json(updated[0]);
  } catch (err) {
    console.error('Failed to complete ride', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// Cron job: send reminders for rides happening in 24 hours
function scheduleReminders() {
  cron.schedule('0 * * * *', async () => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const query = `
    SELECT r.pickup_time, p.phone AS patient_phone, d.phone AS driver_phone
    FROM rides r
    JOIN patients p ON r.patient_id = p.id
    JOIN drivers d ON r.driver_id = d.id
    WHERE r.status = 'confirmed'
      AND r.pickup_time >= $1 AND r.pickup_time < $2
  `;
    try {
      const { rows } = await pool.query(query, [in24h.toISOString(), in25h.toISOString()]);
      for (const ride of rows) {
        const timeStr = new Date(ride.pickup_time).toLocaleString();
        await sendSMS(ride.patient_phone, `Reminder: your ride is scheduled for ${timeStr}.`);
        await sendSMS(ride.driver_phone, `Reminder: you have a ride scheduled for ${timeStr}.`);
      }
    } catch (err) {
      console.error('Failed to send ride reminders', err);
    }
  });
}

module.exports = { app, server, pool, io, scheduleReminders };
