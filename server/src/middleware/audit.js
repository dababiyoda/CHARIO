const { Pool } = require('pg');

const pool = new Pool();

function auditLog(req, res, next) {
  res.on('finish', async () => {
    // Log only successful responses
    try {
      await pool.query(
        'INSERT INTO phi_access_logs (user_id, route, method) VALUES ($1, $2, $3)',
        [req.user ? req.user.id : null, req.originalUrl, req.method]
      );
    } catch (err) {
      console.error('Failed to write audit log', err);
    }
  });
  next();
}

module.exports = auditLog;
