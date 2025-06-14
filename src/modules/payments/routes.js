const express = require('express');
const { prisma } = require('../../utils/db');
const { config } = require('../../config/env');
const stripe = require('stripe')(config.STRIPE_KEY || '');
const { getLogger } = require('../../utils/logger');
const { chargeCard } = require('./service');
const {
  validate,
  paymentCreateSchema,
} = require('../../utils/middleware/validate');

const log = getLogger(__filename);

function createWebhookRouter(io) {
  const router = express.Router();

  router.post(
    '/payments',
    express.json(),
    validate(paymentCreateSchema),
    async (req, res) => {
      try {
        const { rideId, amount, customerId } = req.validated.body;
        const intent = await chargeCard({ rideId, amount, customerId });
        res.status(201).json(intent);
      } catch (err) {
        log.error({ err }, 'failed to create payment');
        res.status(400).json({ error: 'payment failed' });
      }
    },
  );

  router.post(
    '/webhook/stripe',
    express.raw({
      type: 'application/json',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    }),
    async (req, res) => {
      const sig = req.headers['stripe-signature'];
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req.rawBody,
          sig,
          process.env.STRIPE_ENDPOINT_SECRET,
        );

        if (
          (event.livemode && process.env.NODE_ENV !== 'production') ||
          (!event.livemode && process.env.NODE_ENV === 'production')
        ) {
          return res.status(400).send('livemode mismatch');
        }

        const exists = await prisma.webhookEvent.findUnique({
          where: { id: event.id },
        });

        await prisma.webhookEvent.upsert({
          where: { id: event.id },
          create: { id: event.id },
          update: {},
        });

        if (exists) {
          return res.json({ received: true });
        }

        if (event.type === 'payment_intent.succeeded') {
          const intent = event.data.object;
          const ride = await prisma.ride.update({
            where: { stripe_payment_id: intent.id },
            data: { status: 'confirmed' },
          });
          if (ride && io) {
            io.to('drivers').emit('payment_confirmed', ride);
          }
        }

        return res.json({ received: true });
      } catch (err) {
        log.error({ err }, 'Invalid stripe signature');
        return res.status(400).send('invalid signature');
      }
    },
  );

  return router;
}

module.exports = createWebhookRouter;
