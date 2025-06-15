const { spawn } = require('child_process');
const fs = require('fs');
const { getLogger } = require('../src/utils/logger');

const log = getLogger(__filename);
const READY_FILE = '/tmp/migrations-complete';

async function run() {
  log.info('Running prisma migrate deploy');
  await new Promise((resolve, reject) => {
    const proc = spawn('npx', ['prisma', 'migrate', 'deploy'], {
      stdio: 'inherit',
    });
    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`exit code ${code}`));
      }
    });
  });
  fs.writeFileSync(READY_FILE, 'ok');
  log.info('Migrations complete');
}

run().catch((err) => {
  log.error({ err }, 'Migration failed');
  process.exit(1);
});
