const { prisma } = require('./db');
const { getLogger } = require('./logger');
const crypto = require('crypto');

const log = getLogger(__filename);

/**
 * Record an audit event for PHI access.
 * @param {string|null} userId - ID of the authenticated user if available
 * @param {string} action - Description of the access
 */
async function logAudit(userId, action) {
  try {
    const [method, ...pathParts] = action.split(' ');
    const path = pathParts.join(' ');
    const bodyHash = crypto.createHash('sha256').update('').digest('hex');
    await prisma.auditLog.create({
      data: { userId, method, path, bodyHash },
    });
  } catch (err) {
    log.error({ err }, 'Failed to record audit log');
  }
}

module.exports = { logAudit };
