const express = require('express');
const { Pool } = require('pg');
const { config } = require('../../../src/config/env');
const stripe = require('stripe')(config.STRIPE_KEY || '');

const pool = new Pool();

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
          const { rows } = await pool.query(
            `UPDATE rides SET status = 'confirmed' WHERE stripe_payment_id = $1 RETURNING *`,
            [intent.id]
          );
          if (rows[0] && io) {
            io.to('drivers').emit('payment_confirmed', rows[0]);
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
