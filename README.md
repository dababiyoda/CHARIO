# CHARIO
medical rides, simplified. Uber-style app for non-emergency transport: patients schedule trips a week ahead, insurance is auto-verified or card-paid, drivers get guaranteed pickups, and everyone tracks status in real time. Affordable, transparent, and built for healthcare logistics.

## API

### POST /rides
Create a ride request. Requires pickup and dropoff details and a payment_type of `insurance` or `card`.

### PUT /rides/:id/complete
Driver endpoint to mark a ride as completed. Expects `driver_id` in the request body, sets the ride's status to `completed`, timestamps `completed_at` and invokes the payout stub.
