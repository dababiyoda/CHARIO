const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let client;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

async function sendSMS(to, message) {
  if (!client || !fromNumber) {
    console.error('Twilio credentials are not configured');
    return;
  }
  try {
    await client.messages.create({
      body: message,
      from: fromNumber,
      to,
    });
  } catch (err) {
    console.error('Failed to send SMS', err);
  }
}

module.exports = sendSMS;
