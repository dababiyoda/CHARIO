import React from 'react';
import { BottomSheet } from 'react-spring-bottom-sheet';
import 'react-spring-bottom-sheet/dist/style.css';
import Button from './ui/Button.jsx';

const RideDetailsSheet = ({ open, onDismiss, ride }) => (
  <BottomSheet
    open={open}
    onDismiss={onDismiss}
    snapPoints={({ maxHeight }) => [maxHeight * 0.5]}
  >
    {ride && (
      <div className="p-4 space-y-2">
        <h2 className="text-lg font-bold">Ride Details</h2>
        <div>Pickup: {ride.pickup_address}</div>
        <div>Dropoff: {ride.dropoff_address}</div>
        <div>Time: {new Date(ride.pickup_time).toLocaleString()}</div>
        <div>Payment: {ride.payment_type}</div>
        <Button onClick={onDismiss} className="w-full mt-4">
          Close
        </Button>
      </div>
    )}
  </BottomSheet>
);

export default RideDetailsSheet;
