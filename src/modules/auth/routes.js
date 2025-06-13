const express = require('express');
const { registerUser, loginUser, refreshTokens, logout } = require('./service');

function createAuthRouter() {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    try {
      const tokens = await registerUser(req.body);
      res.status(201).json(tokens);
    } catch (err) {
      if (err.message === 'email exists') {
        return res.status(409).json({ error: 'email already registered' });
      }
      return res.status(400).json({ error: 'invalid' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const tokens = await loginUser(req.body);
      res.json(tokens);
    } catch (err) {
      if (err.message === 'otp') {
        return res.status(401).json({ error: 'otp sent' });
      }
      return res.status(401).json({ error: 'invalid credentials' });
    }
  });

  router.post('/token', async (req, res) => {
    try {
      const tokens = await refreshTokens(req.body.refreshToken);
      res.json(tokens);
    } catch (err) {
      res.status(401).json({ error: 'invalid token' });
    }
  });

  router.post('/logout', async (req, res) => {
    await logout(req.body.refreshToken);
    res.status(204).end();
  });

  return router;
}

module.exports = createAuthRouter;
