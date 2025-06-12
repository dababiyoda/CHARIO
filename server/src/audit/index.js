const { Pool } = require('pg');

const pool = new Pool();

/**
 * Record an audit event for PHI access.
 * @param {string|null} userId - ID of the authenticated user if available
 * @param {string} action - Description of the access
 */
async function logAudit(userId, action) {
  const query = `INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)`;
  try {
    await pool.query(query, [userId, action]);
  } catch (err) {
    console.error('Failed to record audit log', err);
  }
}

module.exports = { logAudit };
