const { Worker, Queue, QueueScheduler } = require('bullmq');
const IORedis = require('ioredis');
const { config } = require('../config/env');
const { prisma } = require('../utils/db');
const { getLogger } = require('../utils/logger');
const { sendSMS } = require('../modules/rides/service');

const log = getLogger(__filename);

if (!config.REDIS_URL) {
  log.error('REDIS_URL not configured');
  process.exit(1);
}

const connection = new IORedis(config.REDIS_URL);
const queueName = 'ride-reminders';
const queue = new Queue(queueName, { connection });
const scheduler = new QueueScheduler(queueName, { connection });
const dead = new Queue('dead-letter', { connection });

const worker = new Worker(
  queueName,
  async () => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const rides = await prisma.ride.findMany({
      where: {
        status: 'confirmed',
        pickup_time: { gte: in24h, lt: in25h },
      },
      include: {
        patient: { select: { phone: true } },
        driver: { select: { phone: true } },
      },
    });
    for (const ride of rides) {
      const timeStr = new Date(ride.pickup_time).toLocaleString();
      await sendSMS(
        ride.patient.phone,
        `Reminder: your ride is scheduled for ${timeStr}.`,
      );
      await sendSMS(
        ride.driver.phone,
        `Reminder: you have a ride scheduled for ${timeStr}.`,
      );
    }
  },
  {
    connection,
  },
);

worker.on('failed', async (job, err) => {
  log.error({ jobId: job.id, err }, 'Reminder job failed');
  if (job.attemptsMade >= (job.opts.attempts || 1)) {
    await dead.add('reminder', job.data);
  }
});

process.on('SIGTERM', async () => {
  await worker.close();
  await scheduler.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = { queue };
