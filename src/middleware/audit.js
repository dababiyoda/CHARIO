const crypto = require('crypto');
const { prisma } = require('../utils/db');

module.exports = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    prisma.auditLog
      .create({
        data: {
          userId: req.user?.id || null,
          method: req.method,
          path: req.originalUrl,
          bodyHash: crypto
            .createHash('sha256')
            .update(JSON.stringify(req.body ?? {}))
            .digest('hex'),
        },
      })
      .catch(console.error);
  }
  next();
};
