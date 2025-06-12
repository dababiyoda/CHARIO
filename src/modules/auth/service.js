const jwt = require('jsonwebtoken');

const { config } = require('../../config/env');
const SECRET = config.JWT_SECRET;

function authenticate(req, res, next) {
  const authHeader = req.header('authorization');
  if (!authHeader) {
    return res.status(401).json({ error: 'missing authorization header' });
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');
  try {
    const payload = jwt.verify(token, SECRET);
    if (!payload.id || !['patient', 'driver'].includes(payload.role)) {
      throw new Error('invalid token');
    }
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

function issueToken({ id, role }) {
  if (!id || !['patient', 'driver'].includes(role)) {
    throw new Error('id and valid role required');
  }
  return jwt.sign({ id, role }, SECRET, { expiresIn: '1h' });
}

module.exports = { authenticate, issueToken };
