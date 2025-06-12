jest.mock('@prisma/client');

const express = require('express');
const request = require('supertest');
const stripe = require('stripe')('sk_test');
process.env.DATABASE_URL = 'postgres://test';
process.env.JWT_SECRET = 'secret';
process.env.STRIPE_KEY = 'sk';
process.env.TWILIO_SID = 'sid';
process.env.TWILIO_TOKEN = 'token';
process.env.S3_BUCKET = 'bucket';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
const createWebhookRouter = require('../routes');
const { __rides } = require('@prisma/client');

describe('stripe webhook router', () => {
  let app;
  let emitMock;

  beforeEach(() => {
    app = express();
    emitMock = jest.fn();
    const io = { to: jest.fn().mockReturnValue({ emit: emitMock }) };
    app.use(createWebhookRouter(io));
    __rides.length = 0;
    __rides.push({ id: 1, stripe_payment_id: 'pi_123', status: 'pending' });
  });

  test('valid signature updates ride', async () => {
    const payload = JSON.stringify({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123' } },
    });
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test' });
    const res = await request(app)
      .post('/webhook/stripe')
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(payload);
    expect(res.status).toBe(200);
    expect(__rides[0].status).toBe('confirmed');
    expect(emitMock).toHaveBeenCalled();
  });

  test('invalid signature returns 400', async () => {
    const payload = JSON.stringify({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_123' } } });
    const res = await request(app)
      .post('/webhook/stripe')
      .set('Stripe-Signature', 'bad')
      .set('Content-Type', 'application/json')
      .send(payload);
    expect(res.status).toBe(400);
  });
});
