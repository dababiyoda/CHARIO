# Developer Guide

This document provides an overview of the repository layout and tips for local development.

## Repository layout

- `index.js` – Express entry point exposing the REST API and Socket.IO server.
- `auth.js` – Helpers for issuing and verifying JWTs.
- `payments.js` – Stripe integration used to charge patients.
- `payouts.js` – Stub for paying out drivers (replace with your own logic).
- `insurance.js` – Uploads insurance documents to S3 compatible storage.
- `sms.js` – Sends SMS notifications via Twilio.
- `frontend/` – React components used by the demo front‑end.
- `public/` – Static HTML served by the API server.
- `__tests__/` – Jest test suite with mocked database.
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

### Seeding the database

Sample data can be inserted by running:
```bash
node seed.js
```
Make sure the database defined by `DATABASE_URL` is running and accessible.

## Environment variables

See [README.md](../README.md) for all required environment variables.

