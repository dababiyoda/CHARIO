const { Pool } = require('pg');

module.exports = async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await pool.end();
};
