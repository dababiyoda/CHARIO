const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const { payoutDriver } = require('./payments/payouts');
const { authenticate } = require('./auth');
const { sendSMS } = require('./rides/sms');
const cron = require('node-cron');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const auditLog = require('./middleware/audit');
const validate = require('./middleware/validate');
const { z } = require('zod');

const app = express();
app.use(helmet());
app.use(rateLimit({ windowMs: 60 * 1000, max: 60 }));
app.use(express.json());
app.use(express.static('public'));
app.use(auditLog);

if (process.env.FORCE_HTTPS === 'true') {
  app.enable('trust proxy');
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
  });
}

// HTTP/HTTPS and Socket.io server setup
let server;
if (process.env.HTTPS_KEY_PATH && process.env.HTTPS_CERT_PATH) {
  const key = fs.readFileSync(process.env.HTTPS_KEY_PATH);
  const cert = fs.readFileSync(process.env.HTTPS_CERT_PATH);
  server = https.createServer({ key, cert }, app);
} else {
  server = http.createServer(app);
}
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  socket.on('join_drivers', () => {
    socket.join('drivers');
  });
});

const pool = new Pool();

function requireDriver(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthenticated' });
  }
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'driver role required' });
  }
  next();
}

const createRideSchema = z.object({
  pickup_time: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d.getTime() - Date.now() >= 7 * 24 * 60 * 60 * 1000;
  }, { message: 'pickup_time must be at least 7 days in the future' }),
  pickup_address: z.string().min(1),
  dropoff_address: z.string().min(1),
  payment_type: z.enum(['insurance', 'card'])
});

const ridesQuerySchema = z.object({
  status: z.string().optional(),
  driver_id: z.string().optional(),
  patient_id: z.string().optional()
});

const idParamSchema = z.object({ id: z.string().min(1) });

// POST /rides handler
app.post('/rides', validate(createRideSchema), async (req, res) => {
  try {
    const { pickup_time, pickup_address, dropoff_address, payment_type } = req.body;
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
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Failed to create ride', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// GET /rides handler
app.get('/rides', authenticate, validate(ridesQuerySchema, 'query'), async (req, res) => {
  try {
    const { status, driver_id, patient_id } = req.query;
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
    return res.json(rows);
  } catch (err) {
    console.error('Failed to fetch rides', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// PUT /rides/:id/assign handler
app.put('/rides/:id/assign', authenticate, requireDriver, validate(idParamSchema, 'params'), async (req, res) => {
  try {
    const { id } = req.params;

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
    return res.json(updated[0]);
  } catch (err) {
    console.error('Failed to assign ride', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// PUT /rides/:id/complete handler
app.put('/rides/:id/complete', authenticate, requireDriver, validate(idParamSchema, 'params'), async (req, res) => {
  try {
    const { id } = req.params;

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

module.exports = { app, server, pool, scheduleReminders };
