const express = require('express');
const { prisma } = require('../db');
const { config } = require('../../../src/config/env');
const stripe = require('stripe')(config.STRIPE_KEY || '');


function createWebhookRouter(io) {
  const router = express.Router();

  router.post(
    '/webhook/stripe',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const sig = req.header('stripe-signature');
      try {
        const event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          config.STRIPE_WEBHOOK_SECRET
        );

        if (event.type === 'payment_intent.succeeded') {
          const intent = event.data.object;
          const ride = await prisma.ride.update({
            where: { stripe_payment_id: intent.id },
            data: { status: 'confirmed' }
          });
          if (ride && io) {
            io.to('drivers').emit('payment_confirmed', ride);
          }
        }

        return res.json({ received: true });
      } catch (err) {
        console.error('Invalid stripe signature', err);
        return res.status(400).send('invalid signature');
      }
    }
  );

  return router;
}

module.exports = createWebhookRouter;
