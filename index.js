const express = require('express');
const { Pool } = require('pg');
const { payoutDriver } = require('./payouts');

const app = express();
app.use(express.json());

const pool = new Pool();

function requireDriver(req, res, next) {
  const userId = req.header('x-user-id');
  const role = req.header('x-user-role');
  if (!userId || !role) {
    return res.status(401).json({ error: 'missing auth headers' });
  }
  if (role !== 'driver') {
    return res.status(403).json({ error: 'driver role required' });
  }
  req.user = { id: userId, role };
  next();
}

// POST /rides handler
app.post('/rides', async (req, res) => {
  try {
    const { pickup_time, pickup_address, dropoff_address, payment_type } = req.body;

    // basic validation
    if (!pickup_address || !dropoff_address) {
      return res.status(400).json({ error: 'pickup_address and dropoff_address are required' });
    }

    if (!['insurance', 'card'].includes(payment_type)) {
      return res.status(400).json({ error: 'payment_type must be "insurance" or "card"' });
    }

    const pickupTime = new Date(pickup_time);
    if (isNaN(pickupTime.getTime())) {
      return res.status(400).json({ error: 'pickup_time must be a valid date' });
    }

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
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Failed to create ride', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// PUT /rides/:id/assign handler
app.put('/rides/:id/assign', requireDriver, async (req, res) => {
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
app.put('/rides/:id/complete', requireDriver, async (req, res) => {
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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
