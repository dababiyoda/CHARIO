# CHARIO
![Coverage](coverage.svg)

CHARIO is a simplified ride scheduling system for non-emergency medical transport. Patients can request rides in advance, drivers claim available trips and everyone receives real‑time updates.

## One-command local bootstrap

The fastest way to start all services is with Docker:

```bash
docker compose up
```

This boots Postgres, Redis, MinIO and the API server with sample configuration.
Database migrations and seed data run automatically inside the API container. If
you run the app without Docker, execute:
```bash
npm run migrate && npm run seed
```
before starting the server.

## Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Token signing secret |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_PHONE` | Phone number used to send SMS |
| `S3_BUCKET` | Bucket for insurance uploads |
| `S3_ENDPOINT` | S3 endpoint (for MinIO in dev) |
| `S3_ACCESS_KEY` | Access key for S3/MinIO |
| `S3_SECRET_KEY` | Secret key for S3/MinIO |
| `PORT` | API HTTP port |

A `.env.sample` file in the repository lists these variables with placeholder
values. Copy it to `.env` and update the credentials for local development.

## API endpoints

| Method & Path | Description |
| --- | --- |
| `POST /rides` | Create a ride request |
| `GET /rides` | List rides (filter by status, driver or patient) |
| `PUT /rides/:id/assign` | Assign the authenticated driver to a ride |
| `PUT /rides/:id/complete` | Mark a ride complete and trigger payout |

Real‑time updates are delivered through Socket.IO. Drivers join the `drivers` room and receive `new_ride` events whenever a patient books a trip.

## Slack and Twilio webhook setup

Twilio is used for SMS notifications. Create a Twilio account, note your `ACCOUNT_SID`, `AUTH_TOKEN` and a verified sending number, then set the environment variables shown above.

For Slack notifications you can create an [Incoming Webhook](https://api.slack.com/messaging/webhooks) URL and expose it as `SLACK_WEBHOOK_URL`. Integrations can post ride events to a Slack channel by sending JSON payloads to this URL.

## Running tests

Install dependencies and run:

```bash
npm test
```
For coverage reporting (fails under 80%), run:
```bash
npm run test:ci
```


## Docker image

A `Dockerfile` builds a production image of the API. Use `docker compose up` for local development.

## Security notes

- The API enforces HTTPS; ensure TLS termination in production.
- Insurance documents are uploaded privately to S3 and accessed via pre-signed URLs.
- Access to PHI is audited in the `audit_logs` table.
- `helmet` and request rate limiting are enabled by default.

## Observability

Logging is handled by `pino-http` and each request is tagged with an
`X-Correlation-ID`. Metrics are exposed in Prometheus format at
`/metrics` and include HTTP request latency and a counter of failed ride
operations. These can be visualized with Grafana.

## Developer documentation

Additional details on repository structure and local development can be found in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
