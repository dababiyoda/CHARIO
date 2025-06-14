jest.mock('@prisma/client');

const request = require('supertest');
process.env.DATABASE_URL = 'postgres://test';
process.env.JWT_SECRET = 'a'.repeat(32);
process.env.STRIPE_KEY = 'sk';
process.env.TWILIO_SID = 'sid';
process.env.TWILIO_TOKEN = 'token';
process.env.S3_BUCKET = 'bucket';
process.env.PATIENT_DATA_KEY = 'testkey';
const { app, prisma } = require('../../app');
const { __rides } = require('@prisma/client');

describe('/rides booking endpoint', () => {
  beforeEach(() => {
    __rides.length = 0;
  });

  test('valid booking returns 201', async () => {
    const future = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app).post('/rides').send({
      pickup_time: future,
      pickup_address: 'A',
      dropoff_address: 'B',
      payment_type: 'card',
    });
    expect(res.status).toBe(201);
  });

  test('booking <7 days ahead returns 422', async () => {
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app).post('/rides').send({
      pickup_time: soon,
      pickup_address: 'A',
      dropoff_address: 'B',
      payment_type: 'card',
    });
    expect(res.status).toBe(422);
  });

  test('DB row count increases on success', async () => {
    const future = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    const before = (await prisma.ride.findMany()).length;

    await request(app).post('/rides').send({
      pickup_time: future,
      pickup_address: 'A',
      dropoff_address: 'B',
      payment_type: 'card',
    });

    const after = (await prisma.ride.findMany()).length;

    expect(after).toBe(before + 1);
  });

  test('missing fields return 422', async () => {
    const future = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app).post('/rides').send({
      pickup_time: future,
      dropoff_address: 'B',
      payment_type: 'card',
    });
    expect(res.status).toBe(422);
  });

  test('database errors return 500', async () => {
    const future = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    jest
      .spyOn(prisma.ride, 'create')
      .mockRejectedValueOnce(new Error('db fail'));
    const res = await request(app).post('/rides').send({
      pickup_time: future,
      pickup_address: 'A',
      dropoff_address: 'B',
      payment_type: 'card',
    });
    expect(res.status).toBe(500);
  });
});
