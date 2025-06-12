const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_FROM_PHONE;

const client = twilio(accountSid, authToken);

/**
 * Send an SMS message using Twilio.
 * @param {string} to - Destination phone number.
 * @param {string} message - Message body.
 */
async function sendSMS(to, message) {
  if (!accountSid || !authToken || !fromPhone) {
    throw new Error('Twilio credentials not configured');
  }
  if (!to || !message) {
    throw new Error('to and message are required');
  }
  await client.messages.create({
    from: fromPhone,
    to,
    body: message,
  });
}

module.exports = { sendSMS };
