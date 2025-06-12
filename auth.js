const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'devsecret';

function signToken(user) {
  if (!user || !user.id || !user.role) {
    throw new Error('Invalid user object');
  }
  return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '1h' });
}

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'authorization required' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, SECRET);
    if (!['patient', 'driver'].includes(decoded.role)) {
      return res.status(401).json({ error: 'invalid role' });
    }
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

module.exports = { signToken, authMiddleware };
