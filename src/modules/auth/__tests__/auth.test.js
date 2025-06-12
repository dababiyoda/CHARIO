process.env.DATABASE_URL = 'postgres://test';
process.env.JWT_SECRET = 'secret';
process.env.STRIPE_KEY = 'sk';
process.env.TWILIO_SID = 'sid';
process.env.TWILIO_TOKEN = 'token';
process.env.S3_BUCKET = 'bucket';
const { authenticate, issueToken } = require('../service');

describe('auth module', () => {
  test('issueToken and authenticate success', () => {
    const token = issueToken({ id: 'user1', role: 'driver' });
    const req = { header: () => `Bearer ${token}` };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'user1', role: 'driver' });
  });

  test('missing header returns 401', () => {
    const req = { header: () => null };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
