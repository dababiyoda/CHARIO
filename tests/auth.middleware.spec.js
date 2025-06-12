const express = require('express');
const request = require('supertest');
const { authenticate, issueToken } = require('../src/modules/auth/service');

describe('auth middleware', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.get('/private', authenticate, (req, res) => res.json({ ok: true }));
  });

  test('missing token -> 401', async () => {
    const res = await request(app).get('/private');
    expect(res.status).toBe(401);
  });

  test('invalid token -> 401', async () => {
    const res = await request(app)
      .get('/private')
      .set('Authorization', 'Bearer bad');
    expect(res.status).toBe(401);
  });
});
