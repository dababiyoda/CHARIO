# CHARIO
medical rides, simplified. Uber-style app for non-emergency transport: patients schedule trips a week ahead, insurance is auto-verified or card-paid, drivers get guaranteed pickups, and everyone tracks status in real time. Affordable, transparent, and built for healthcare logistics.

## API

### POST /rides
Create a ride request. Requires pickup and dropoff details and a payment_type of `insurance` or `card`.

### PUT /rides/:id/complete
Driver endpoint to mark a ride as completed. Requires `x-user-id` and `x-user-role=driver` headers. If the authenticated driver owns the ride and it is not yet completed, its status becomes `completed`, `completed_at` is timestamped and the payout stub is triggered.

### PUT /rides/:id/assign
Assigns the authenticated driver to an unclaimed ride. Requires the same auth headers as above.
