const rides = [];
const insuranceDocs = [];

class Pool {
  query(sql, params = []) {
    sql = sql.trim();
    if (sql.startsWith('INSERT INTO rides')) {
      const ride = {
        id: rides.length + 1,
        pickup_time: params[0],
        pickup_address: params[1],
        dropoff_address: params[2],
        payment_type: params[3],
        status: 'pending'
      };
      rides.push(ride);
      return Promise.resolve({ rows: [ride] });
    }
    if (sql.startsWith('INSERT INTO insurance_docs')) {
      insuranceDocs.push({ ride_id: params[0], s3_key: params[1] });
      return Promise.resolve({ rows: [] });
    }
    if (sql.startsWith('UPDATE rides')) {
      const id = params[1];
      const ride = rides.find(r => r.id === id);
      if (ride) {
        ride.stripe_payment_id = params[0];
        ride.status = 'confirmed';
        return Promise.resolve({ rows: [] });
      }
    }
    if (sql.startsWith('SELECT COUNT(*) FROM rides')) {
      return Promise.resolve({ rows: [{ count: String(rides.length) }] });
    }
    return Promise.resolve({ rows: [] });
  }
}

module.exports = { Pool, __rides: rides, __insuranceDocs: insuranceDocs };
