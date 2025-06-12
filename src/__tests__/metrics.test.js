jest.mock('stripe', () =>
  jest.fn(() => ({
    balance: { retrieve: jest.fn().mockResolvedValue({}) },
  })),
);

const request = require('supertest');

let app;

beforeEach(() => {
  jest.resetModules();
  process.env.DATABASE_URL = 'postgres://test';
  process.env.JWT_SECRET = 'secret';
  process.env.STRIPE_KEY = 'sk';
  process.env.TWILIO_SID = 'sid';
  process.env.TWILIO_TOKEN = 'token';
  process.env.S3_BUCKET = 'bucket';
  process.env.METRICS_USER = 'met';
  process.env.METRICS_PASS = 'pass';
  ({ app } = require('../app'));
});

describe('GET /metrics', () => {
  test('accepts valid credentials', async () => {
    const res = await request(app).get('/metrics').auth('met', 'pass');
    expect(res.status).toBe(200);
  });

  test('rejects invalid credentials', async () => {
    const res = await request(app).get('/metrics').auth('met', 'bad');
    expect(res.status).toBe(401);
  });
});
