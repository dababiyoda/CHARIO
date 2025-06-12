const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  await client.connect();
  try {
    // Insert patients
    for (let i = 1; i <= 5; i++) {
      await client.query(
        'INSERT INTO patients (name, phone) VALUES ($1, $2)',
        [`Patient ${i}`, `555-000${i}`]
      );
    }

    // Insert drivers
    for (let i = 1; i <= 3; i++) {
      await client.query(
        'INSERT INTO drivers (name, phone) VALUES ($1, $2)',
        [`Driver ${i}`, `555-100${i}`]
      );
    }

    // Insert rides
    for (let i = 1; i <= 3; i++) {
      const patientId = i; // simple mapping
      const driverId = i; // simple mapping
      const pickupTime = new Date(Date.now() + i * 86400000); // i days from now
      const status = i === 1 ? 'completed' : 'pending';
      const completed = status === 'completed' ? new Date() : null;
      await client.query(
        'INSERT INTO rides (patient_id, driver_id, pickup_time, pickup_address, dropoff_address, payment_type, status, completed_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          patientId,
          driverId,
          pickupTime,
          `Patient ${i} Home`,
          `Clinic ${i}`,
          i % 2 === 0 ? 'card' : 'insurance',
          status,
          completed,
        ]
      );
    }

    console.log('Seed data inserted successfully.');
  } catch (err) {
    console.error('Error inserting seed data:', err);
  } finally {
    await client.end();
  }
}

seed();
