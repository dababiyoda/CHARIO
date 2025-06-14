const express = require('express');
const { registerUser, loginUser, refreshTokens, logout } = require('./service');
const {
  validate,
  signupSchema,
  loginSchema,
} = require('../../utils/middleware/validate');
const { z } = require('zod');

function createAuthRouter() {
  const router = express.Router();
  router.use(express.json());

  const refreshSchema = z.object({
    body: z.object({ refreshToken: z.string().min(1) }),
  });

  router.post('/register', validate(signupSchema), async (req, res) => {
    try {
      const tokens = await registerUser(req.validated.body);
      res.status(201).json(tokens);
    } catch (err) {
      if (err.message === 'email exists') {
        return res.status(409).json({ error: 'email already registered' });
      }
      return res.status(400).json({ error: 'invalid' });
    }
  });

  router.post('/login', validate(loginSchema), async (req, res) => {
    try {
      const tokens = await loginUser(req.validated.body);
      res.json(tokens);
    } catch (err) {
      if (err.message === 'otp') {
        return res.status(401).json({ error: 'otp sent' });
      }
      return res.status(401).json({ error: 'invalid credentials' });
    }
  });

  router.post('/token', validate(refreshSchema), async (req, res) => {
    try {
      const tokens = await refreshTokens(req.validated.body.refreshToken);
      res.json(tokens);
    } catch (err) {
      res.status(401).json({ error: 'invalid token' });
    }
  });

  router.post('/logout', validate(refreshSchema), async (req, res) => {
    await logout(req.validated.body.refreshToken);
    res.status(204).end();
  });

  return router;
}

module.exports = createAuthRouter;
