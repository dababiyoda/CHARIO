jest.mock('@prisma/client');

const express = require('express');
const request = require('supertest');
process.env.DATABASE_URL = 'postgres://test';
process.env.JWT_SECRET = 'a'.repeat(32);
process.env.STRIPE_KEY = 'sk';
process.env.TWILIO_SID = 'sid';
process.env.TWILIO_TOKEN = 'token';
process.env.S3_BUCKET = 'bucket';

const createRouter = require('../routes');
const service = require('../service');

describe('POST /payments', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(createRouter());
    jest.spyOn(service, 'chargeCard').mockResolvedValue({ id: 'pi' });
  });

  test('invalid body returns 422 without calling service', async () => {
    const res = await request(app).post('/payments').send({ amount: 1 });
    expect(res.status).toBe(422);
    expect(service.chargeCard).not.toHaveBeenCalled();
  });
});
