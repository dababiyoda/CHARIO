const { prisma } = require('../db');
const { createHash } = require('crypto');

function audit(req, res, next) {
  res.on('finish', async () => {
    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) return;
    try {
      const bodyString = JSON.stringify(req.body || {});
      const bodyHash = createHash('sha256').update(bodyString).digest('hex');
      await prisma.auditLog.create({
        data: {
          user_id: req.user ? req.user.id : null,
          method: req.method,
          path: req.path,
          body_hash: bodyHash
        }
      });
    } catch (err) {
      console.error('Failed to record audit log', err);
    }
  });
  next();
}

module.exports = audit;
