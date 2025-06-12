const cron = require('node-cron');
const { config } = require('../src/config/env');
const stripe = require('stripe')(config.STRIPE_KEY);
const { prisma } = require('../src/utils/db');
const { getLogger } = require('../src/utils/logger');

const log = getLogger(__filename);

async function reconcile() {
  try {
    const rides = await prisma.ride.findMany({
      where: { status: 'completed', payoutId: null },
      include: {
        driver: { select: { stripeAccountId: true } },
      },
    });
    for (const ride of rides) {
      if (!ride.driver || !ride.driver.stripeAccountId) {
        log.warn({ rideId: ride.id }, 'No driver stripe account');
        continue;
      }
      const amount = Math.round(Number(ride.amount || 0) * 100);
      const transfer = await stripe.transfers.create({
        amount,
        currency: 'usd',
        destination: ride.driver.stripeAccountId,
      });
      await prisma.ride.update({
        where: { id: ride.id },
        data: { payoutId: transfer.id },
      });
      log.info(
        { rideId: ride.id, transferId: transfer.id },
        'Payout reconciled',
      );
    }
  } catch (err) {
    log.error({ err }, 'Reconcile failed');
  }
}

cron.schedule('0 3 * * *', reconcile);
