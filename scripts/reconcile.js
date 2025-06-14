const { Queue, Worker, QueueScheduler } = require('bullmq');
const IORedis = require('ioredis');
const Redlock = require('redlock');
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

const connection = new IORedis(config.REDIS_URL);
const queue = new Queue('payout-reconcile', { connection });
const scheduler = new QueueScheduler('payout-reconcile', { connection });
const dead = new Queue('dead-letter', { connection });
const redlock = new Redlock([connection]);

async function schedule() {
  try {
    const lock = await redlock.acquire(['locks:payout-reconcile'], 60000);
    await queue.add(
      'reconcile',
      {},
      {
        jobId: 'payout-reconcile',
        repeat: { cron: '0 3 * * *' },
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
    await lock.release();
  } catch (err) {
    if (err.name !== 'LockError') {
      log.error({ err }, 'Failed to schedule reconcile job');
    }
  }
}

schedule();

const worker = new Worker('payout-reconcile', reconcile, { connection });

worker.on('failed', async (job, err) => {
  log.error({ jobId: job.id, err }, 'Reconcile job failed');
  if (job.attemptsMade >= (job.opts.attempts || 1)) {
    await dead.add('reconcile', job.data);
  }
});

process.on('SIGTERM', async () => {
  await worker.close();
  await scheduler.close();
  await connection.quit();
  await prisma.$disconnect();
});
