const { Queue } = require('bullmq');
const IORedis = require('ioredis');
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
  await q.add('payout', { rideId });
  log.info({ rideId }, 'Queued payout');
}

module.exports = { payoutDriver, getQueue };
