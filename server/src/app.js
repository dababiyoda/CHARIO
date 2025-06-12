const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const pinoHttp = require('pino-http');
const { randomUUID } = require('crypto');
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
const Joi = require('joi');
const { logAudit } = require('./audit');

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

const rideSchema = Joi.object({
  pickup_time: Joi.string().isoDate().required(),
  pickup_address: Joi.string().required(),
  dropoff_address: Joi.string().required(),
  payment_type: Joi.string().valid('insurance', 'card').required()
});

const ridesQuerySchema = Joi.object({
  status: Joi.string(),
  driver_id: Joi.string(),
  patient_id: Joi.string()
});

const idSchema = Joi.string().guid({ version: 'uuidv4' });

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
app.post('/rides', async (req, res) => {
  try {
    const { error, value } = rideSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const { pickup_time, pickup_address, dropoff_address, payment_type } = value;

    const pickupTime = new Date(pickup_time);
    const msInWeek = 7 * 24 * 60 * 60 * 1000;
    if (pickupTime.getTime() - Date.now() < msInWeek) {
      return res.status(400).json({ error: 'pickup_time must be at least 7 days in the future' });
    }

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
app.get('/rides', authenticate, async (req, res) => {
  try {
    const { error, value } = ridesQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const { status, driver_id, patient_id } = value;
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
app.put('/rides/:id/assign', authenticate, requireDriver, async (req, res) => {
  try {
    const { error, value } = idSchema.validate(req.params.id);
    if (error) {
      return res.status(400).json({ error: 'invalid id' });
    }
    const id = value;

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
app.put('/rides/:id/complete', authenticate, requireDriver, async (req, res) => {
  try {
    const { error, value } = idSchema.validate(req.params.id);
    if (error) {
      return res.status(400).json({ error: 'invalid id' });
    }
    const id = value;

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
