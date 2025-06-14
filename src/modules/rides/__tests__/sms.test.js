jest.mock('twilio', () =>
  jest.fn(() => ({
    messages: { create: jest.fn().mockResolvedValue(true) },
  })),
);

describe('sendSMS', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DATABASE_URL = 'postgres://test';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.STRIPE_KEY = 'sk';
    process.env.TWILIO_SID = 'sid';
    process.env.TWILIO_TOKEN = 'token';
    process.env.TWILIO_FROM_PHONE = '+1';
    process.env.S3_BUCKET = 'bucket';
  });

  test('sends sms via twilio', async () => {
    const twilio = require('twilio');
    const { sendSMS } = require('../service');
    await sendSMS('+2', 'hi');
    expect(twilio).toHaveBeenCalledWith('sid', 'token');
    const client = twilio.mock.results[0].value;
    expect(client.messages.create).toHaveBeenCalledWith({
      from: '+1',
      to: '+2',
      body: 'hi',
    });
  });
});
