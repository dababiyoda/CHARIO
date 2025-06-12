const { Client } = require('pg');

const { config } = require('./src/config/env');
const { getLogger } = require('./src/utils/logger');

const log = getLogger(__filename);

const client = new Client({
  connectionString: config.DATABASE_URL,
});

async function seed() {
  await client.connect();
  try {
    const patientIds = [];
    const driverIds = [];

    // Insert patients
    for (let i = 1; i <= 5; i++) {
      const { rows } = await client.query(
        'INSERT INTO patients (name, phone) VALUES ($1, $2) RETURNING id',
        [`Patient ${i}`, `555-000${i}`],
      );
      patientIds.push(rows[0].id);
    }

    // Insert drivers
    for (let i = 1; i <= 3; i++) {
      const { rows } = await client.query(
        'INSERT INTO drivers (name, phone) VALUES ($1, $2) RETURNING id',
        [`Driver ${i}`, `555-100${i}`],
      );
      driverIds.push(rows[0].id);
    }

    // Insert rides
    for (let i = 0; i < 3; i++) {
      const patientId = patientIds[i % patientIds.length];
      const driverId = driverIds[i % driverIds.length];
      const pickupTime = new Date(Date.now() + (i + 1) * 86400000);
      await client.query(
        'INSERT INTO rides (patient_id, driver_id, pickup_time, pickup_address, dropoff_address, payment_type, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          patientId,
          driverId,
          pickupTime,
          `Patient ${i + 1} Home`,
          `Clinic ${i + 1}`,
          (i + 1) % 2 === 0 ? 'card' : 'insurance',
          'pending',
        ],
      );
    }

    log.info('Seed data inserted successfully.');
  } catch (err) {
    log.error({ err }, 'Error inserting seed data');
  } finally {
    await client.end();
  }
}

seed();
