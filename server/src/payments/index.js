const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Pool } = require('pg');

const pool = new Pool();

/**
 * Charge a customer's default card for a ride.
 * @param {Object} params
 * @param {string} params.rideId - ID of the ride being charged
 * @param {number} params.amount - Amount in dollars
 * @param {string} params.customerId - Stripe customer ID
 * @returns {Promise<Object>} Stripe PaymentIntent object
 */
async function chargeCard({ rideId, amount, customerId }) {
  if (!rideId || !amount || !customerId) {
    throw new Error('rideId, amount, and customerId are required');
  }
  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(amount * 100),
        currency: 'usd',
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        confirm: true,
        metadata: { ride_id: String(rideId) },
      },
      { idempotencyKey: rideId }
    );

    const updateQuery = `
      UPDATE rides
      SET stripe_payment_id = $1,
          status = 'confirmed'
      WHERE id = $2
    `;
    await pool.query(updateQuery, [paymentIntent.id, rideId]);

    return paymentIntent;
  } catch (err) {
    console.error('Failed to charge card', err);
    throw err;
  }
}

module.exports = { chargeCard };
