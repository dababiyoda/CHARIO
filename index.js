const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool();

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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
