# CHARIO

CHARIO is a simplified ride scheduling system for non-emergency medical transport. Patients can request rides in advance, drivers claim available trips and everyone receives real‑time updates.

## One-command local bootstrap

The fastest way to start all services is with Docker:

```bash
docker compose up
```

This boots Postgres, Redis, MinIO and the API server with sample configuration.

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
| `HTTPS_KEY_PATH` | Path to TLS private key |
| `HTTPS_CERT_PATH` | Path to TLS certificate |
| `FORCE_HTTPS` | Redirect HTTP to HTTPS when set to `true` |

## Security notes

- The API supports HTTPS when `HTTPS_KEY_PATH` and `HTTPS_CERT_PATH` are provided.
- Uploaded insurance documents are stored privately in S3 and returned via pre-signed URLs.
- Database access is logged to `phi_access_logs` for compliance auditing.
- Configure your database with encryption at rest to protect PHI.

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

## Docker image

A `Dockerfile` builds a production image of the API. Use `docker compose up` for local development.

## Developer documentation

Additional details on repository structure and local development can be found in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
