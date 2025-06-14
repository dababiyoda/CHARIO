const { Pool } = require('pg');
const { config } = require('../src/config/env');
const { getLogger } = require('../src/utils/logger');

const log = getLogger(__filename);

async function run() {
  const pool = new Pool({ connectionString: config.DATABASE_URL });
  try {
    const key = config.PATIENT_DATA_KEY;
    await pool.query(
      'UPDATE patients SET name = pgp_sym_encrypt(name, $1)::text, phone = pgp_sym_encrypt(phone, $1)::text',
      [key],
    );
    await pool.query(
      'UPDATE rides SET pickup_address = pgp_sym_encrypt(pickup_address, $1)::text, dropoff_address = pgp_sym_encrypt(dropoff_address, $1)::text',
      [key],
    );
    log.info('PII encryption backfill complete');
  } catch (err) {
    log.error({ err }, 'Backfill failed');
  } finally {
    await pool.end();
  }
}

run();
