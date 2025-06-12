const request = require('supertest');
jest.mock('@prisma/client');

const { app } = require('../src/app');

const { __rides } = require('@prisma/client');
describe('POST /rides controller', () => {
  beforeEach(async () => {
    __rides.length = 0;
  });

  test('happy path returns 201', async () => {
    const future = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app).post('/rides').send({
      pickup_time: future,
      pickup_address: 'A',
      dropoff_address: 'B',
      payment_type: 'card',
    });
    expect(res.status).toBe(201);
    expect(__rides).toHaveLength(1);
  });

  test('pickup_time < 7 days returns 422', async () => {
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app).post('/rides').send({
      pickup_time: soon,
      pickup_address: 'A',
      dropoff_address: 'B',
      payment_type: 'card',
    });
    expect(res.status).toBe(422);
    expect(__rides).toHaveLength(0);
  });
});
