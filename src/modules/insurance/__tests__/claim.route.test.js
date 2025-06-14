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

describe('POST /insurance/claim', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(createRouter());
    jest.spyOn(service, 'uploadInsurance').mockResolvedValue();
  });

  test('invalid body returns 422 without upload', async () => {
    const res = await request(app).post('/insurance/claim').send({});
    expect(res.status).toBe(422);
    expect(service.uploadInsurance).not.toHaveBeenCalled();
  });
});
