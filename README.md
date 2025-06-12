# CHARIO

medical rides, simplified. Uber-style app for non-emergency transport: patients schedule trips a week ahead, insurance is auto-verified or card-paid, drivers get guaranteed pickups, and everyone tracks status in real time. Affordable, transparent, and built for healthcare logistics.

## Real-time driver updates

A Socket.IO server runs alongside the Express API. When a ride is created with a `pending` status, the server emits a `new_ride` event to the `drivers` room. A driver client can join this room and prepend a card in the UI for the new ride.

Example client usage:

```html
<script src="/socket.io/socket.io.js"></script>
<script>
  const socket = io();
  socket.emit('join_drivers');
  socket.on('new_ride', ride => {
    const list = document.getElementById('rides');
    if (list) {
      const card = document.createElement('div');
      card.textContent = `${ride.pickup_address} → ${ride.dropoff_address}`;
      list.prepend(card);
    }
  });
</script>
```

## Local setup

1. Install Node.js 18 and PostgreSQL.
2. Copy `schema.sql` into your database and create the tables.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set the following environment variables:
   - `DATABASE_URL` – connection string for Postgres
   - `JWT_SECRET` – token signing secret
   - `STRIPE_SECRET_KEY` – Stripe API key
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE` – for SMS
   - `S3_BUCKET` – bucket for insurance uploads
5. Start the server:
   ```bash
   npm start
   ```

## Running tests

The project uses Jest and Supertest for API tests. After installing dependencies, run:

```bash
npm test
```

## Docker

A `docker-compose.yml` is provided for local development with Postgres, Redis and MinIO. Run:

```bash
docker compose up
```

The `Dockerfile` builds a production image of the API.

## Security notes

- The server enforces HTTPS in production; run behind a TLS-terminating proxy.
- Insurance documents are uploaded to S3 with private ACLs and returned via pre-signed URLs.
- Configure your Postgres instance with encryption at rest.
- All access to PHI is recorded in the `audit_logs` table.
- Helmet, rate limiting and Joi validation are enabled on all endpoints.

