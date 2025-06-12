jest.mock('stripe', () => jest.fn(() => ({
  paymentIntents: { create: jest.fn().mockResolvedValue({ id: 'pi_1' }) }
})));

process.env.DATABASE_URL = 'postgres://test';
process.env.JWT_SECRET = 'secret';
process.env.STRIPE_KEY = 'sk';
process.env.TWILIO_SID = 'sid';
process.env.TWILIO_TOKEN = 'token';
process.env.S3_BUCKET = 'bucket';

const { Pool, __rides } = require('pg');
const { chargeCard } = require('../index');

describe('chargeCard', () => {
  beforeEach(() => {
    __rides.length = 0;
    __rides.push({ id: 1 });
  });

  test('creates PaymentIntent and updates ride', async () => {
    const pool = new Pool();
    await chargeCard({ rideId: 1, amount: 10, customerId: 'cus_1' });
    const ride = __rides.find(r => r.id === 1);
    expect(ride.stripe_payment_id).toBe('pi_1');
    expect(ride.status).toBe('confirmed');
  });

  test('missing parameters throw error', async () => {
    await expect(chargeCard({ amount: 10, customerId: 'c' }))
      .rejects.toThrow('rideId, amount, and customerId are required');
  });

  test('stripe errors propagate', async () => {
    const stripeFactory = require('stripe');
    const stripeInstance = stripeFactory.mock.results[0].value;
    stripeInstance.paymentIntents.create.mockRejectedValueOnce(new Error('bad'));
    await expect(chargeCard({ rideId: 1, amount: 10, customerId: 'cus_1' }))
      .rejects.toThrow('bad');
  });
});
