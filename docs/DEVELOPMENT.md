# Developer Guide

This document provides an overview of the repository layout and tips for local development.

## Repository layout

- `index.js` – Bootstrap file that loads environment variables and starts the server.
- `src/` – Back-end source organized by feature:
  - `modules/auth/` – Helpers for issuing and verifying JWTs.
  - `modules/payments/` – Stripe integration and driver payouts.
  - `modules/insurance/` – Uploads insurance documents to S3 compatible storage.
  - `modules/rides/` – Express routes and SMS helpers for ride scheduling.
- `frontend/` – React components used by the demo front‑end.
- `public/` – Static HTML served by the API server.
- `__tests__/` – Reserved for integration tests.
- `docs/ARCHITECTURE.md` – Request flows and schema overview.

## Running locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start supporting services and the API using Docker Compose:
   ```bash
   docker compose up
   ```
   The API will be available on `http://localhost:3000`.
3. Run the linter and tests:
   ```bash
   npm run lint
   npm test
   ```
   To run Jest directly without npm prompting for confirmation, use:
   ```bash
   npx --yes jest --runInBand --no-colors
   ```

### Seeding the database

Sample data can be inserted by running:
```bash
npm run seed
```
Make sure the database defined by `DATABASE_URL` is running and accessible.

## Environment variables

See [README.md](../README.md) for all required environment variables.

### Security

The API uses `helmet` and request rate limiting. TLS termination must be handled by your deployment (e.g., behind a load balancer). Insurance uploads are private and served via pre‑signed URLs. Audit events for PHI access are stored in `audit_logs`.

### Observability

`pino-http` logs each request with a correlation ID in the `X-Correlation-ID`
header. Application logs use `pino` with pretty output in development and are
available per module. Prometheus metrics are served from `/metrics` and include
request latency and failed ride counters. Access to the metrics endpoint is
protected with basic authentication. The container exposes port `9100` for
Prometheus scraping.

