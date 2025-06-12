jest.mock('aws-sdk', () => {
  return { S3: jest.fn(() => ({
    upload: jest.fn(() => ({ promise: jest.fn().mockResolvedValue({}) })),
    getSignedUrl: jest.fn(() => 'http://signed-url')
  })) };
});

const { __insuranceDocs } = require('pg');
const uploadInsurance = require('../index');

process.env.S3_BUCKET = 'bucket';

describe('uploadInsurance', () => {
  beforeEach(() => {
    __insuranceDocs.length = 0;
  });

  test('uploads file to s3 and records doc', async () => {
    const url = await uploadInsurance(Buffer.from('buf'), 'f.txt', 1);
    expect(url).toBe('http://signed-url');
    expect(__insuranceDocs.length).toBe(1);
    expect(__insuranceDocs[0]).toEqual({ ride_id: 1, s3_key: 'f.txt' });
  });

  test('missing S3_BUCKET throws error', async () => {
    delete process.env.S3_BUCKET;
    await expect(uploadInsurance(Buffer.from('b'), 'f.txt', 1))
      .rejects.toThrow('S3_BUCKET env var required');
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
