import React, { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const BookingForm = () => {
  const getDefaultDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  };

  const [pickupAddress, setPickupAddress] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(getDefaultDate());
  const [time, setTime] = useState('');
  const [paymentType, setPaymentType] = useState('insurance');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pickup_time = `${date}T${time}`;
    try {
      const res = await fetch('/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_time,
          pickup_address: pickupAddress,
          dropoff_address: destination,
          payment_type: paymentType,
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      toast.success('Ride booked successfully!');
      setPickupAddress('');
      setDestination('');
      setDate(getDefaultDate());
      setTime('');
      setPaymentType('insurance');
    } catch (err) {
      toast.error('Failed to book ride');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="pickup">
          Pickup Address
        </label>
        <input
          id="pickup"
          type="text"
          value={pickupAddress}
          onChange={(e) => setPickupAddress(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="destination">
          Destination
        </label>
        <input
          id="destination"
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>
      <div className="flex space-x-2">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1" htmlFor="date">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1" htmlFor="time">
            Time
          </label>
          <input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
      </div>
      <div>
        <span className="block text-sm font-medium mb-1">Payment Type</span>
        <label className="mr-4">
          <input
            type="radio"
            name="payment_type"
            value="insurance"
            checked={paymentType === 'insurance'}
            onChange={() => setPaymentType('insurance')}
            className="mr-1"
          />
          Insurance
        </label>
        <label>
          <input
            type="radio"
            name="payment_type"
            value="card"
            checked={paymentType === 'card'}
            onChange={() => setPaymentType('card')}
            className="mr-1"
          />
          Card
        </label>
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        Book Ride
      </button>
    </form>
  );
};

export default BookingForm;
