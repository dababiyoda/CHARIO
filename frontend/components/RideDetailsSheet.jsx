import React from 'react';
import { BottomSheet } from 'react-spring-bottom-sheet';
import 'react-spring-bottom-sheet/dist/style.css';

const RideDetailsSheet = ({ open, onDismiss, ride }) => (
  <BottomSheet open={open} onDismiss={onDismiss} snapPoints={({ maxHeight }) => [maxHeight * 0.6, maxHeight]}> 
    {ride && (
      <div className="p-4 space-y-2">
        <h2 className="text-lg font-semibold">Ride Details</h2>
        <p>Patient: {ride.patient_name}</p>
        <p>Pickup: {ride.pickup_address}</p>
        <p>Dropoff: {ride.dropoff_address}</p>
        <p>Time: {new Date(ride.pickup_time).toLocaleString()}</p>
      </div>
    )}
  </BottomSheet>
);

export default RideDetailsSheet;
