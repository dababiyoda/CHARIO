process.env = {
  ...process.env,
  DATABASE_URL: 'postgresql://chario:chario@localhost:5432/chario_test',
  JWT_SECRET: 'testsecret',
  STRIPE_KEY: 'sk_test_123',
  TWILIO_SID: 'ACxxx',
  TWILIO_TOKEN: 'xxx',
  S3_BUCKET: 'dummy',
};
