const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const crypto = require('crypto');
const { config } = require('../../config/env');
const { getLogger } = require('../../utils/logger');

const log = getLogger(__filename);

let queue;

function getQueue() {
  if (!queue && config.REDIS_URL) {
    const connection = new IORedis(config.REDIS_URL);
    queue = new Queue('payouts', { connection });
  }
  return queue;
}

async function payoutDriver(_driverId, rideId) {
  const q = getQueue();
  if (!q) {
    log.warn({ rideId }, 'Redis not configured; payout skipped');
    return;
  }
  const date = new Date().toISOString().slice(0, 10);
  const jobId = crypto
    .createHash('sha256')
    .update(`${rideId}${date}`)
    .digest('hex');
  await q.add(
    'payout',
    { rideId },
    {
      jobId,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
    },
  );
  log.info({ rideId }, 'Queued payout');
}

module.exports = { payoutDriver, getQueue };
