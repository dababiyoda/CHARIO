const { authenticate, issueToken } = require('../index');

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
