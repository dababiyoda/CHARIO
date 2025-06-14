const { spawnSync } = require('child_process');
const { config: dotenvSafe } = require('dotenv-safe');
const { z } = require('zod');
const path = require('path');

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cache = { timestamp: 0, env: {} };

function loadSecrets() {
  if (Date.now() - cache.timestamp < CACHE_TTL) {
    Object.assign(process.env, cache.env);
    return;
  }

  const names = [
    'DATABASE_URL',
    'JWT_SECRET',
    'STRIPE_KEY',
    'TWILIO_SID',
    'TWILIO_TOKEN',
    'S3_BUCKET',
    'S3_ENDPOINT',
    'S3_ACCESS_KEY',
    'S3_SECRET_KEY',
    'PATIENT_DATA_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'TWILIO_FROM_PHONE',
    'METRICS_USER',
    'METRICS_PASS',
    'COMMIT_SHA',
    'REDIS_URL',
  ];

  const script = path.resolve(__dirname, '../../ops/secrets/fetch-secrets.js');
  const result = spawnSync('node', [script, ...names], { encoding: 'utf8' });
  if (result.status === 0 && result.stdout) {
    try {
      const output = JSON.parse(result.stdout);
      cache = { timestamp: Date.now(), env: output };
      Object.assign(process.env, output);
    } catch (err) {
      console.error('Failed to parse secrets output', err);
    }
  } else if (result.error) {
    console.error('Failed to load secrets', result.error);
  }
}

// Load environment variables. During tests, rely solely on process.env
if (process.env.NODE_ENV !== 'test') {
  dotenvSafe({ allowEmptyValues: true });
  loadSecrets();
}

const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  STRIPE_KEY: process.env.STRIPE_KEY || process.env.STRIPE_SECRET_KEY,
  TWILIO_SID: process.env.TWILIO_SID || process.env.TWILIO_ACCOUNT_SID,
  TWILIO_TOKEN: process.env.TWILIO_TOKEN || process.env.TWILIO_AUTH_TOKEN,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
  S3_SECRET_KEY: process.env.S3_SECRET_KEY,
  PORT: process.env.PORT,
  PATIENT_DATA_KEY: process.env.PATIENT_DATA_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  TWILIO_FROM_PHONE: process.env.TWILIO_FROM_PHONE,
  NODE_ENV: process.env.NODE_ENV,
  METRICS_USER: process.env.METRICS_USER,
  METRICS_PASS: process.env.METRICS_PASS,
  COMMIT_SHA: process.env.COMMIT_SHA,
  REDIS_URL: process.env.REDIS_URL,
};

const schema = z.object({
  DATABASE_URL: z.string().nonempty(),
  JWT_SECRET: z.string().nonempty(),
  STRIPE_KEY: z.string().nonempty(),
  TWILIO_SID: z.string().nonempty(),
  TWILIO_TOKEN: z.string().nonempty(),
  S3_BUCKET: z.string().nonempty(),
  PATIENT_DATA_KEY: z.string().nonempty(),
});

const result = schema.safeParse(env);
if (!result.success) {
  const missing = result.error.errors.map((e) => e.path[0]).join(', ');
  throw new Error(`Missing required env vars: ${missing}`);
}

const config = Object.freeze({ ...env, ...result.data });

module.exports = { config };
