const { getLogger } = require('../../utils/logger');
const log = getLogger(__filename);

function payoutDriver(driverId, rideId) {
  // In a real system, trigger Stripe payout here
  log.info(`Stub payout to driver ${driverId} for ride ${rideId}`);
}

module.exports = { payoutDriver };
