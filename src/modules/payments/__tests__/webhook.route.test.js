jest.mock('@prisma/client');

const express = require('express');
const request = require('supertest');
const stripe = require('stripe')('sk_test');
process.env.DATABASE_URL = 'postgres://test';
process.env.JWT_SECRET = 'a'.repeat(32);
process.env.STRIPE_KEY = 'sk';
process.env.TWILIO_SID = 'sid';
process.env.TWILIO_TOKEN = 'token';
process.env.S3_BUCKET = 'bucket';
process.env.STRIPE_ENDPOINT_SECRET = 'whsec_test';
process.env.NODE_ENV = 'test';
const createWebhookRouter = require('../routes');
const { __rides, __webhookEvents } = require('@prisma/client');

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
      id: 'evt_valid',
      livemode: false,
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123' } },
    });
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: 'whsec_test',
    });
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
    const payload = JSON.stringify({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123' } },
    });
    const res = await request(app)
      .post('/webhook/stripe')
      .set('Stripe-Signature', 'bad')
      .set('Content-Type', 'application/json')
      .send(payload);
    expect(res.status).toBe(400);
  });

  test('mismatched livemode returns 400', async () => {
    const payload = JSON.stringify({
      id: 'evt_live',
      livemode: true,
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123' } },
    });
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: 'whsec_test',
    });
    const res = await request(app)
      .post('/webhook/stripe')
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(payload);
    expect(res.status).toBe(400);
  });

  test('duplicate events are ignored', async () => {
    __webhookEvents.length = 0;
    const payload = JSON.stringify({
      id: 'evt_1',
      livemode: false,
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123' } },
    });
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: 'whsec_test',
    });

    const res1 = await request(app)
      .post('/webhook/stripe')
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(payload);
    const statusAfterFirst = __rides[0].status;

    const res2 = await request(app)
      .post('/webhook/stripe')
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(__webhookEvents.length).toBe(1);
    expect(__rides[0].status).toBe(statusAfterFirst);
  });
});
