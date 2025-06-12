const express = require('express');
const request = require('supertest');
jest.mock('@prisma/client');
const { __rides } = require('@prisma/client');
process.env.DATABASE_URL = 'postgres://test';
process.env.JWT_SECRET = 'secret';
process.env.STRIPE_KEY = 'sk';
process.env.TWILIO_SID = 'sid';
process.env.TWILIO_TOKEN = 'token';
process.env.S3_BUCKET = 'bucket';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
const createWebhookRouter = require('../src/modules/payments/routes');
const stripe = require('stripe')('sk_test');

describe('stripe webhook route', () => {
  beforeEach(() => {
    __rides.length = 0;
    __rides.push({ id: 1, stripe_payment_id: 'pi_123', status: 'pending' });
  });

  test('constructEvent throws -> 400', async () => {
    jest.spyOn(stripe.webhooks, 'constructEvent').mockImplementation(() => {
      throw new Error('bad');
    });
    const app = express();
    app.use(createWebhookRouter());
    const res = await request(app)
      .post('/webhook/stripe')
      .set('Stripe-Signature', 'sig')
      .set('Content-Type', 'application/json')
      .send('{}');
    expect(res.status).toBe(400);
  });

  test('success updates ride status', async () => {
    const payload = JSON.stringify({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123' } },
    });
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: 'whsec_test',
    });
    const app = express();
    const emit = jest.fn();
    const io = { to: jest.fn(() => ({ emit })) };
    app.use(createWebhookRouter(io));
    const res = await request(app)
      .post('/webhook/stripe')
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(payload);
    expect(res.status).toBe(200);
    expect(__rides[0].status).toBe('confirmed');
    expect(emit).toHaveBeenCalledWith(
      'payment_confirmed',
      expect.objectContaining({ id: 1 }),
    );
  });
});
