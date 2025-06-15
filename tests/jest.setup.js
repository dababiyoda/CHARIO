const nock = require('nock');
nock('https://api.stripe.com').post(/.*/).reply(200, { success: true });

process.env = {
  ...process.env,
  DATABASE_URL: 'postgresql://testuser:testpass@localhost:5432/testdb',
  JWT_SECRET: 'a'.repeat(32),
  STRIPE_KEY: 'sk_test_123',
  TWILIO_SID: 'ACxxx',
  TWILIO_TOKEN: 'xxx',
  S3_BUCKET: 'dummy',
  PATIENT_DATA_KEY: 'testkey',
  STRIPE_ENDPOINT_SECRET: 'whsec_test',
  NODE_ENV: 'test',
};
