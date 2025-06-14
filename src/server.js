const { config } = require('./config/env');
const { server, prisma, scheduleReminders } = require('./app');
const { getLogger } = require('./utils/logger');

const log = getLogger(__filename);
const port = config.PORT || 3000;

function shutdown() {
  log.info('🛑 shutting down');
  // stop accepting new requests and close db
  server.close(() => {
    prisma.$disconnect().finally(() => {
      process.exit(1);
    });
  });
}

process.on('unhandledRejection', (err) => {
  log.fatal({ err }, 'Unhandled Rejection');
  shutdown();
});

process.on('uncaughtException', (err) => {
  log.fatal({ err }, 'Uncaught Exception');
  shutdown();
});

function start() {
  try {
    scheduleReminders();
    server.listen(port, () => log.info(`Server running on port ${port}`));
  } catch (err) {
    log.fatal({ err }, 'Failed to start server');
    shutdown();
  }
}

start();

module.exports = { start, shutdown };
