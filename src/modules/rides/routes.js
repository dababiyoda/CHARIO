const express = require('express');
const { prisma } = require('../../utils/db');
const { authenticate } = require('../auth/service');
const {
  validate,
  rideCancelSchema,
} = require('../../utils/middleware/validate');

function createRidesRouter() {
  const router = express.Router();
  router.use(express.json());

  router.post(
    '/rides/:id/cancel',
    authenticate,
    validate(rideCancelSchema),
    async (req, res) => {
      try {
        const id = req.validated.params.id;
        const ride = await prisma.ride.findUnique({ where: { id } });
        if (!ride) return res.status(404).json({ error: 'ride not found' });
        await prisma.ride.update({
          where: { id },
          data: { status: 'pending' },
        });
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ error: 'internal server error' });
      }
    },
  );

  return router;
}

module.exports = createRidesRouter;
