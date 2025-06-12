# CHARIO
medical rides, simplified. Uber-style app for non-emergency transport: patients schedule trips a week ahead, insurance is auto-verified or card-paid, drivers get guaranteed pickups, and everyone tracks status in real time. Affordable, transparent, and built for healthcare logistics.

## Authentication

Routes like `POST /rides` are now protected with JWT authentication. Clients must
provide a `Bearer` token issued after login. Use the helper exported from
`auth.js` to create tokens:

```javascript
const { signToken } = require('./auth');
const token = signToken({ id: user.id, role: user.role });
```

The middleware attaches `req.user = { id, role }` when a valid token with role
`patient` or `driver` is supplied.
