const { Worker, Queue } = require('bullmq');
const IORedis = require('ioredis');
const { config } = require('../config/env');
const stripe = require('stripe')(config.STRIPE_KEY);
const { prisma } = require('../utils/db');
const { getLogger } = require('../utils/logger');

const log = getLogger(__filename);

if (!config.REDIS_URL) {
  log.error('REDIS_URL not configured');
  process.exit(1);
}

const connection = new IORedis(config.REDIS_URL);
const queue = new Queue('payouts', { connection });

const worker = new Worker(
  'payouts',
  async (job) => {
    const { rideId } = job.data;
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { driver: { select: { stripeAccountId: true } } },
    });
    if (!ride || !ride.driver || !ride.driver.stripeAccountId) {
      throw new Error('missing driver account');
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
    log.info({ rideId: ride.id, transferId: transfer.id }, 'Payout processed');
  },
  { connection },
);

worker.on('failed', (job, err) => {
  log.error({ jobId: job.id, err }, 'Payout job failed');
});

process.on('SIGTERM', async () => {
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = { queue };
