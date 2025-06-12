const { prisma } = require('./db');
const { getLogger } = require('./logger');

const log = getLogger(__filename);

/**
 * Record an audit event for PHI access.
 * @param {string|null} userId - ID of the authenticated user if available
 * @param {string} action - Description of the access
 */
async function logAudit(userId, action) {
  try {
    await prisma.auditLog.create({ data: { user_id: userId, action } });
  } catch (err) {
    log.error({ err }, 'Failed to record audit log');
  }
}

module.exports = { logAudit };
