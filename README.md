# CHARIO
medical rides, simplified. Uber-style app for non-emergency transport: patients schedule trips a week ahead, insurance is auto-verified or card-paid, drivers get guaranteed pickups, and everyone tracks status in real time. Affordable, transparent, and built for healthcare logistics.

## Real-time driver updates

A Socket.IO server runs alongside the Express API. When a ride is created with a `pending` status, the server emits a `new_ride` event to the `drivers` room. A driver client can join this room and prepend a card in the UI for the new ride.

Example client usage:

```html
<script src="/socket.io/socket.io.js"></script>
<script>
  const socket = io();
  socket.emit('join_drivers');
  socket.on('new_ride', ride => {
    const list = document.getElementById('rides');
    if (list) {
      const card = document.createElement('div');
      card.textContent = `${ride.pickup_address} → ${ride.dropoff_address}`;
      list.prepend(card);
    }
  });
</script>
```
