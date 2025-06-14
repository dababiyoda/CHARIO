jest.mock('stripe', () =>
  jest.fn(() => ({
    balance: { retrieve: jest.fn().mockResolvedValue({}) },
  })),
);

const request = require('supertest');

describe('GET /health', () => {
  let app;
  beforeEach(() => {
    jest.resetModules();
    process.env.DATABASE_URL = 'postgres://test';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.STRIPE_KEY = 'sk';
    process.env.TWILIO_SID = 'sid';
    process.env.TWILIO_TOKEN = 'token';
    process.env.S3_BUCKET = 'bucket';
    process.pkg = { version: '1.0.0' };
    ({ app } = require('../app'));
  });

  test('returns ok statuses', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ db: 'ok', stripe: 'ok', version: '1.0.0' });
  });
});
