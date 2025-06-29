jest.mock('@prisma/client');

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
const { app, io } = require('../../../app');
const { __rides } = require('@prisma/client');

describe('stripe webhook', () => {
  beforeEach(() => {
    __rides.length = 0;
    __rides.push({ id: 1, stripe_payment_id: 'pi_123', status: 'pending' });
    process.env.STRIPE_ENDPOINT_SECRET = 'whsec_test';
    process.env.NODE_ENV = 'test';
  });

  test('valid signature updates ride and emits', async () => {
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
    const emitMock = jest.fn();
    jest.spyOn(io, 'to').mockReturnValue({ emit: emitMock });

    const res = await request(app)
      .post('/webhook/stripe')
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(res.status).toBe(200);
    expect(__rides[0].status).toBe('confirmed');
    expect(emitMock).toHaveBeenCalledWith(
      'payment_confirmed',
      expect.objectContaining({ id: 1 }),
    );
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
});
