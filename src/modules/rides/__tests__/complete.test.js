const request = require('supertest');
jest.mock('@prisma/client');

process.env.DATABASE_URL = 'postgres://test';
process.env.JWT_SECRET = 'secret';
process.env.STRIPE_KEY = 'sk';
process.env.TWILIO_SID = 'sid';
process.env.TWILIO_TOKEN = 'token';
process.env.S3_BUCKET = 'bucket';

const { app } = require('../../../app');
const { issueToken } = require('../../auth/service');
const { __rides } = require('@prisma/client');

const driverId = 'driver123';
const rideId = '123e4567-e89b-42d3-a456-426614174000';

function authHeader(id = driverId) {
  const token = issueToken({ id, role: 'driver' });
  return { Authorization: `Bearer ${token}` };
}

describe('PUT /rides/:id/complete', () => {
  beforeEach(() => {
    __rides.length = 0;
  });

  test('completes ride for assigned driver', async () => {
    __rides.push({ id: rideId, driver_id: driverId, status: 'confirmed' });
    const res = await request(app)
      .put(`/rides/${rideId}/complete`)
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(__rides[0].status).toBe('completed');
  });

  test('returns 404 for missing ride', async () => {
    const res = await request(app)
      .put(`/rides/${rideId}/complete`)
      .set(authHeader());
    expect(res.status).toBe(404);
  });

  test('returns 403 for unassigned driver', async () => {
    __rides.push({ id: rideId, driver_id: 'other', status: 'confirmed' });
    const res = await request(app)
      .put(`/rides/${rideId}/complete`)
      .set(authHeader());
    expect(res.status).toBe(403);
  });

  test('returns 409 when already completed', async () => {
    __rides.push({ id: rideId, driver_id: driverId, status: 'completed' });
    const res = await request(app)
      .put(`/rides/${rideId}/complete`)
      .set(authHeader());
    expect(res.status).toBe(409);
  });
});
