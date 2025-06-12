const { config: load } = require('dotenv');
const { z } = require('zod');

load();

const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  STRIPE_KEY: process.env.STRIPE_KEY || process.env.STRIPE_SECRET_KEY,
  TWILIO_SID: process.env.TWILIO_SID || process.env.TWILIO_ACCOUNT_SID,
  TWILIO_TOKEN: process.env.TWILIO_TOKEN || process.env.TWILIO_AUTH_TOKEN,
  S3_BUCKET: process.env.S3_BUCKET,
  PORT: process.env.PORT,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  TWILIO_FROM_PHONE: process.env.TWILIO_FROM_PHONE,
  NODE_ENV: process.env.NODE_ENV,
  METRICS_USER: process.env.METRICS_USER,
  METRICS_PASS: process.env.METRICS_PASS,
};

const schema = z.object({
  DATABASE_URL: z.string().nonempty(),
  JWT_SECRET: z.string().nonempty(),
  STRIPE_KEY: z.string().nonempty(),
  TWILIO_SID: z.string().nonempty(),
  TWILIO_TOKEN: z.string().nonempty(),
  S3_BUCKET: z.string().nonempty(),
});

const result = schema.safeParse(env);
if (!result.success) {
  const missing = result.error.errors.map(e => e.path[0]).join(', ');
  throw new Error(`Missing required env vars: ${missing}`);
}

const config = Object.freeze({ ...env, ...result.data });

module.exports = { config };
