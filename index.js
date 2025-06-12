const express = require('express');
const { Pool } = require('pg');
const cron = require('node-cron');
const sendSMS = require('./sms');

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

// send reminders hourly for rides occurring in 24 hours
cron.schedule('0 * * * *', async () => {
  const now = new Date();
  const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const query = `
    SELECT rides.pickup_time, patients.phone AS patient_phone, drivers.phone AS driver_phone
    FROM rides
    JOIN patients ON rides.patient_id = patients.id
    JOIN drivers ON rides.driver_id = drivers.id
    WHERE rides.pickup_time >= $1 AND rides.pickup_time < $2
  `;
  try {
    const { rows } = await pool.query(query, [start.toISOString(), end.toISOString()]);
    for (const ride of rows) {
      const time = new Date(ride.pickup_time).toLocaleString();
      await sendSMS(ride.patient_phone, `Reminder: you have a ride scheduled at ${time}.`);
      await sendSMS(ride.driver_phone, `Reminder: drive scheduled at ${time}.`);
    }
  } catch (err) {
    console.error('Error sending reminders', err);
  }
});
