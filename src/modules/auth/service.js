const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { randomUUID, createHash } = crypto;
const { prisma } = require('../../utils/db');
const { config } = require('../../config/env');
const { sendSMS } = require('../rides/service');

const SECRET = config.JWT_SECRET;
const ACCESS_TTL = '15m';
const REFRESH_TTL = '24h';
const BCRYPT_ROUNDS = 12;

const otpStore = new Map();

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function issueAccessToken({ id, role }) {
  if (!id || !role) throw new Error('id and role required');
  return jwt.sign({ sub: id, role, type: 'access' }, SECRET, {
    expiresIn: ACCESS_TTL,
  });
}

function issueRefreshToken({ id }) {
  const jti = randomUUID();
  const token = jwt.sign({ sub: id, jti, type: 'refresh' }, SECRET, {
    expiresIn: REFRESH_TTL,
  });
  return { token, jti };
}

async function createSession(userId, token) {
  const payload = jwt.decode(token);
  const hash = createHash('sha256').update(token).digest('hex');
  return prisma.session.create({
    data: {
      id: payload.jti,
      userId,
      tokenHash: hash,
      expiresAt: new Date(payload.exp * 1000),
      revokedAt: null,
    },
  });
}

async function revokeSession(id) {
  return prisma.session.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

async function findValidSession(token) {
  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
  if (payload.type !== 'refresh') return null;
  const hash = createHash('sha256').update(token).digest('hex');
  const session = await prisma.session.findUnique({
    where: { id: payload.jti },
  });
  if (!session || session.tokenHash !== hash) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt < new Date()) return null;
  return { payload, session };
}

async function issueTokens(user) {
  const accessToken = issueAccessToken(user);
  const { token: refreshToken } = issueRefreshToken(user);
  await createSession(user.id, refreshToken);
  return { accessToken, refreshToken };
}

async function registerUser({ email, phone, password, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('email exists');
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, phone, passwordHash, role },
  });
  return issueTokens(user);
}

async function sendOTP(user) {
  const code = (100000 + crypto.randomInt(900000)).toString();
  const codeHash = await hashPassword(code);
  otpStore.set(user.email, { codeHash, expires: Date.now() + 10 * 60 * 1000 });
  if (user.phone) {
    await sendSMS(user.phone, `Your login code is ${code}`);
  }
}

async function loginUser({ email, password, otp }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('invalid');
  if (password && (await verifyPassword(password, user.passwordHash))) {
    return issueTokens(user);
  }
  const entry = otpStore.get(email);
  if (
    otp &&
    entry &&
    entry.expires > Date.now() &&
    (await verifyPassword(otp, entry.codeHash))
  ) {
    otpStore.delete(email);
    return issueTokens(user);
  }
  await sendOTP(user);
  throw new Error('otp');
}

async function refreshTokens(token) {
  const data = await findValidSession(token);
  if (!data) throw new Error('invalid');
  await revokeSession(data.payload.jti);
  const user = await prisma.user.findUnique({
    where: { id: data.payload.sub },
  });
  return issueTokens(user);
}

async function logout(token) {
  const data = await findValidSession(token);
  if (data) await revokeSession(data.payload.jti);
}

function authenticate(req, res, next) {
  const authHeader = req.header('authorization');
  if (!authHeader) {
    return res.status(401).json({ error: 'missing authorization header' });
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.type !== 'access') throw new Error('invalid token');
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'unauthenticated' });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

module.exports = {
  authenticate,
  authorize,
  issueAccessToken,
  issueToken: issueAccessToken,
  registerUser,
  loginUser,
  refreshTokens,
  logout,
  // Exported for tests
  _otpStore: otpStore,
};
