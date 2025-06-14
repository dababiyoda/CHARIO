const { Pool } = require('pg');
const { config } = require('../src/config/env');
const { getLogger } = require('../src/utils/logger');
const log = getLogger(__filename);

async function run() {
  const pool = new Pool({ connectionString: config.DATABASE_URL });
  try {
    const checkPatient = await pool.query(
      "SELECT COUNT(*) FROM patients WHERE name NOT LIKE '\\x%' OR phone NOT LIKE '\\x%'",
    );
    const checkRide = await pool.query(
      "SELECT COUNT(*) FROM rides WHERE pickup_address NOT LIKE '\\x%' OR dropoff_address NOT LIKE '\\x%'",
    );
    const count =
      Number(checkPatient.rows[0].count) + Number(checkRide.rows[0].count);
    if (count > 0) {
      throw new Error(`${count} rows contain plaintext PHI`);
    }
    log.info('All PHI fields encrypted');
  } catch (err) {
    log.error({ err }, 'Validation failed');
    process.exit(1);
  } finally {
    await pool.end();
  }
}
run();
