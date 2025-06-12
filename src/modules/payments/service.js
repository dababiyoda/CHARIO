const { config } = require('../../config/env');
const stripe = require('stripe')(config.STRIPE_KEY);
const { prisma } = require('../../utils/db');

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

    await prisma.ride.update({
      where: { id: rideId },
      data: { stripe_payment_id: paymentIntent.id, status: 'confirmed' }
    });

    return paymentIntent;
  } catch (err) {
    console.error('Failed to charge card', err);
    throw err;
  }
}

module.exports = { chargeCard };
