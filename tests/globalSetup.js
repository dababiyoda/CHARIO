const { Pool } = require('pg');

module.exports = async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  for (let i = 0; i < 5; i += 1) {
    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
      break;
    } catch (err) {
      if (i === 4) throw err;
      console.log('Waiting for postgres...');
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
  await pool.end();
};
