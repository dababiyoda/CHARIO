# System Architecture

This document provides an overview of the CHARIO service including request flows, database layout and example API payloads.

## Sequence diagram

```mermaid
sequenceDiagram
    participant Patient
    participant API
    participant Stripe

    Patient->>API: POST /pay
    API->>Stripe: create payment intent
    Stripe-->>API: payment result
    API-->>Patient: confirmation
```

## Endpoint security

| Endpoint | Auth | Rate-limit | Audit-log |
| -------- | ---- | ---------- | --------- |
| POST /signup | none | yes | yes |
| POST /login | none | yes | yes |
| POST /rides | none | yes | yes |
| GET /rides | bearer | yes | yes |
| PUT /rides/:id/assign | driver token | yes | yes |
| PUT /rides/:id/complete | driver token | yes | yes |
| GET /insurance/:id | bearer | yes | no |
| POST /webhook/stripe | secret | yes | no |
| GET /metrics | basic auth | yes | no |
| GET /health | none | yes | no |

## Database schema

The PostgreSQL schema is managed through Knex migrations and contains the following tables:

- `patients` – registered riders
- `drivers` – available drivers
- `rides` – trip requests linking patients and drivers
- `payments` – Stripe payment intents
- `insurance_docs` – uploaded insurance forms
- `audit_logs` – records of PHI access

Key indexes exist on `rides.pickup_time` and `rides.status`.

## Request/response examples

### Create a ride

Request:

```bash
POST /rides
Content-Type: application/json

{
  "pickup_time": "2024-12-01T15:00:00Z",
  "pickup_address": "100 Clinic Way",
  "dropoff_address": "200 Wellness Ave",
  "payment_type": "card"
}
```

Response:

```json
{
  "id": "<uuid>",
  "status": "pending",
  "pickup_time": "2024-12-01T15:00:00.000Z"
}
```

### Assign a ride

```bash
PUT /rides/<id>/assign
Authorization: Bearer <token>
```

Returns the updated ride object with `status` set to `confirmed`.
