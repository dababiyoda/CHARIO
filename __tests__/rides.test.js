const request = require('supertest');

const rides = [];
const mockQuery = jest.fn();

jest.mock('pg', () => {
  return { Pool: jest.fn(() => ({ query: mockQuery })) };
});

const { app } = require('../index');

describe('POST /rides', () => {
  beforeEach(() => {
    rides.length = 0;
    mockQuery.mockImplementation((text, params) => {
      if (text.includes('INSERT INTO rides')) {
        const ride = {
          id: rides.length + 1,
          pickup_time: params[0],
          pickup_address: params[1],
          dropoff_address: params[2],
          payment_type: params[3],
          status: 'pending',
        };
        rides.push(ride);
        return Promise.resolve({ rows: [ride] });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  test('valid booking returns 201', async () => {
    const future = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app).post('/rides').send({
      pickup_time: future,
      pickup_address: 'A St',
      dropoff_address: 'B St',
      payment_type: 'card',
    });
    expect(res.status).toBe(201);
  });

  test('booking <7 days ahead returns 400', async () => {
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app).post('/rides').send({
      pickup_time: soon,
      pickup_address: 'A St',
      dropoff_address: 'B St',
      payment_type: 'card',
    });
    expect(res.status).toBe(400);
  });

  test('DB row count increases on success', async () => {
    expect(rides).toHaveLength(0);
    const future = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    await request(app).post('/rides').send({
      pickup_time: future,
      pickup_address: 'A St',
      dropoff_address: 'B St',
      payment_type: 'insurance',
    });
    expect(rides).toHaveLength(1);
  });
});
