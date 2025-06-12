-- SQL schema for CHARIO database
-- This file creates patients, drivers, rides, and payments tables with UUID primary keys
-- and appropriate foreign key relationships. It also includes indexes for ride pickup time
-- and status.

-- Enable extension for generating UUIDs if not already enabled.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Patients table
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drivers table
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enum type for ride status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ride_status') THEN
        CREATE TYPE ride_status AS ENUM ('pending', 'confirmed', 'completed');
    END IF;
END $$;

-- Rides table linking patients and drivers
CREATE TABLE rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    pickup_time TIMESTAMPTZ NOT NULL,
    pickup_address TEXT NOT NULL,
    dropoff_address TEXT NOT NULL,
    payment_type TEXT NOT NULL,
    status ride_status NOT NULL DEFAULT 'pending',
    insurance_id UUID NULL,
    -- use TEXT for Stripe PaymentIntent ids like "pi_..."
    stripe_payment_id TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for queries on pickup_time and status
CREATE INDEX idx_rides_pickup_time ON rides(pickup_time);
CREATE INDEX idx_rides_status ON rides(status);

-- Audit log table for PHI access
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    action TEXT NOT NULL,
    details TEXT,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
