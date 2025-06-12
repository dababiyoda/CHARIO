function payoutDriver(driverId, rideId) {
  // In a real system, trigger Stripe payout here
  console.log(`Stub payout to driver ${driverId} for ride ${rideId}`);
}

module.exports = { payoutDriver };
