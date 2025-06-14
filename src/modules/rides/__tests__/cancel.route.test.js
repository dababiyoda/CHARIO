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
const { issueToken } = require('../../auth/service');
const { prisma } = require('../../../utils/db');

describe('POST /rides/:id/cancel', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(createRouter());
  });

  function auth() {
    const token = issueToken({ id: 'p1', role: 'patient' });
    return { Authorization: `Bearer ${token}` };
  }

  test('invalid id returns 422 without db call', async () => {
    const spy = jest.spyOn(prisma.ride, 'findUnique');
    const res = await request(app).post('/rides/bad/cancel').set(auth()).send();
    expect(res.status).toBe(422);
    expect(spy).not.toHaveBeenCalled();
  });
});
