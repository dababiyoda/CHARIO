jest.mock('twilio', () =>
  jest.fn(() => ({ messages: { create: jest.fn().mockResolvedValue(true) } })),
);

process.env.DATABASE_URL = 'postgres://test';
process.env.JWT_SECRET = 'a'.repeat(32);
process.env.STRIPE_KEY = 'sk';
process.env.TWILIO_SID = 'sid';
process.env.TWILIO_TOKEN = 'token';
process.env.TWILIO_FROM_PHONE = '+1';
process.env.S3_BUCKET = 'bucket';

const request = require('supertest');
const express = require('express');
const createAuthRouter = require('../routes');
const { __users, __sessions } = require('@prisma/client');
const { _otpStore } = require('../service');
const crypto = require('crypto');

describe('auth flow', () => {
  let app;
  beforeEach(() => {
    jest.resetModules();
    __users.length = 0;
    __sessions.length = 0;
    _otpStore.clear();
    jest.spyOn(crypto, 'randomInt').mockReturnValue(450000);
    app = express();
    app.use(express.json());
    app.use('/auth', createAuthRouter());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('register and login with password', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'a@b.com',
      phone: '1',
      password: 'pass',
      role: 'patient',
    });
    expect(res.status).toBe(201);
    expect(__users).toHaveLength(1);
    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'a@b.com', password: 'pass' });
    expect(login.status).toBe(200);
    expect(login.body).toHaveProperty('accessToken');
    expect(login.body).toHaveProperty('refreshToken');
  });

  test('otp fallback and refresh rotation', async () => {
    await request(app).post('/auth/register').send({
      email: 'b@b.com',
      phone: '2',
      password: 'pass',
      role: 'patient',
    });
    const fail = await request(app)
      .post('/auth/login')
      .send({ email: 'b@b.com', password: 'bad' });
    expect(fail.status).toBe(401);
    const code = '550000';
    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'b@b.com', otp: code });
    const oldRefresh = login.body.refreshToken;
    const refreshed = await request(app)
      .post('/auth/token')
      .send({ refreshToken: oldRefresh });
    expect(refreshed.status).toBe(200);
    const replay = await request(app)
      .post('/auth/token')
      .send({ refreshToken: oldRefresh });
    expect(replay.status).toBe(401);
  });
});
