jest.mock('aws-sdk', () => {
  return { S3: jest.fn(() => ({
    upload: jest.fn(() => ({ promise: jest.fn().mockResolvedValue({}) })),
    getSignedUrl: jest.fn(() => 'http://signed-url')
  })) };
});

let uploadInsurance;
let __insuranceDocs;

describe('uploadInsurance', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DATABASE_URL = 'postgres://test';
    process.env.JWT_SECRET = 'secret';
    process.env.STRIPE_KEY = 'sk';
    process.env.TWILIO_SID = 'sid';
    process.env.TWILIO_TOKEN = 'token';
    process.env.S3_BUCKET = 'bucket';
    ({ __insuranceDocs } = require('@prisma/client'));
    uploadInsurance = require('../index');
    __insuranceDocs.length = 0;
  });

test('uploads file to s3 and records doc', async () => {
    const url = await uploadInsurance(Buffer.from('buf'), 'f.txt', 1);
    expect(url).toBe('http://signed-url');
    expect(__insuranceDocs.length).toBe(1);
    expect(__insuranceDocs[0]).toMatchObject({ ride_id: 1, s3_key: 'f.txt' });
  });

test('missing S3_BUCKET throws error', () => {
    delete process.env.S3_BUCKET;
    jest.resetModules();
    expect(() => {
      require('../index');
    }).toThrow('Missing required env vars: S3_BUCKET');
    process.env.S3_BUCKET = 'bucket';
  });

test('upload failure propagates error', async () => {
    const AWS = require('aws-sdk');
    const instance = AWS.S3.mock.results[0].value;
    instance.upload.mockImplementation(() => ({ promise: jest.fn().mockRejectedValue(new Error('fail')) }));
    await expect(uploadInsurance(Buffer.from('b'), 'f.txt', 1))
      .rejects.toThrow('fail');
});
});
