jest.mock('pg');

const request = require('supertest');
process.env.DATABASE_URL = 'postgres://test';
process.env.JWT_SECRET = 'secret';
process.env.STRIPE_KEY = 'sk';
process.env.TWILIO_SID = 'sid';
process.env.TWILIO_TOKEN = 'token';
process.env.S3_BUCKET = 'bucket';
const { app, pool } = require('../app');
const { __rides } = require('pg');

describe('/rides booking endpoint', () => {
  beforeEach(() => {
    __rides.length = 0;
  });

  test('valid booking returns 201', async () => {
    const future = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/rides')
      .send({
        pickup_time: future,
        pickup_address: 'A',
        dropoff_address: 'B',
        payment_type: 'card'
      });
    expect(res.status).toBe(201);
  });

  test('booking <7 days ahead returns 422', async () => {
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/rides')
      .send({
        pickup_time: soon,
        pickup_address: 'A',
        dropoff_address: 'B',
        payment_type: 'card'
      });
    expect(res.status).toBe(422);
  });

  test('DB row count increases on success', async () => {
    const future = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    const { rows: beforeRows } = await pool.query('SELECT COUNT(*) FROM rides');
    const before = parseInt(beforeRows[0].count, 10);

    await request(app)
      .post('/rides')
      .send({
        pickup_time: future,
        pickup_address: 'A',
        dropoff_address: 'B',
        payment_type: 'card'
      });

    const { rows: afterRows } = await pool.query('SELECT COUNT(*) FROM rides');
    const after = parseInt(afterRows[0].count, 10);

    expect(after).toBe(before + 1);
  });

  test('missing fields return 422', async () => {
    const future = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/rides')
      .send({ pickup_time: future, dropoff_address: 'B', payment_type: 'card' });
    expect(res.status).toBe(422);
  });

  test('database errors return 500', async () => {
    const future = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    jest.spyOn(pool, 'query').mockRejectedValueOnce(new Error('db fail'));
    const res = await request(app)
      .post('/rides')
      .send({
        pickup_time: future,
        pickup_address: 'A',
        dropoff_address: 'B',
        payment_type: 'card'
      });
    expect(res.status).toBe(500);
  });
});
