jest.mock('twilio', () => jest.fn(() => ({
  messages: { create: jest.fn().mockResolvedValue(true) }
})));

describe('sendSMS', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.TWILIO_ACCOUNT_SID = 'sid';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    process.env.TWILIO_FROM_PHONE = '+1';
  });

  test('sends sms via twilio', async () => {
    const twilio = require('twilio');
    const { sendSMS } = require('../sms');
    await sendSMS('+2', 'hi');
    expect(twilio).toHaveBeenCalledWith('sid', 'token');
    const client = twilio.mock.results[0].value;
    expect(client.messages.create).toHaveBeenCalledWith({ from: '+1', to: '+2', body: 'hi' });
  });
});
