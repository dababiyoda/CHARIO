const { prisma } = require('./db');

/**
 * Record an audit event for PHI access.
 * @param {string|null} userId - ID of the authenticated user if available
 * @param {string} action - Description of the access
 */
async function logAudit(userId, action) {
  try {
    await prisma.auditLog.create({ data: { user_id: userId, action } });
  } catch (err) {
    console.error('Failed to record audit log', err);
  }
}

module.exports = { logAudit };
