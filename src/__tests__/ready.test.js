const fs = require('fs');
const request = require('supertest');

describe('GET /readyz', () => {
  let app;
  beforeEach(() => {
    jest.resetModules();
    process.env.DATABASE_URL = 'postgres://test';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.STRIPE_KEY = 'sk';
    process.env.TWILIO_SID = 'sid';
    process.env.TWILIO_TOKEN = 'token';
    process.env.S3_BUCKET = 'bucket';
    ({ app } = require('../app'));
    if (fs.existsSync('/tmp/migrations-complete')) {
      fs.unlinkSync('/tmp/migrations-complete');
    }
  });

  test('returns 503 until migrations finish', async () => {
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(503);
  });

  test('returns 200 after migrations', async () => {
    fs.writeFileSync('/tmp/migrations-complete', 'ok');
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
    fs.unlinkSync('/tmp/migrations-complete');
  });
});
