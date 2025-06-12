# CHARIO
medical rides, simplified. Uber-style app for non-emergency transport: patients schedule trips a week ahead, insurance is auto-verified or card-paid, drivers get guaranteed pickups, and everyone tracks status in real time. Affordable, transparent, and built for healthcare logistics.

## API

### POST /rides
Create a ride request. Requires pickup and dropoff details and a payment_type of `insurance` or `card`.

### PUT /rides/:id/complete
Driver endpoint to mark a ride as completed. Requires `driver_id` in the request body. If the ride is found for that driver and not already completed, its status becomes `completed`, `completed_at` is timestamped and the payout stub is triggered.
