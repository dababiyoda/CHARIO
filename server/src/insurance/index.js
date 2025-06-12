const AWS = require('aws-sdk');
const { Pool } = require('pg');
const { Readable } = require('stream');

const s3 = new AWS.S3();
const pool = new Pool();

/**
 * Streams a file to S3 and stores metadata in insurance_docs.
 * @param {Buffer} fileBuffer the file contents
 * @param {string} fileName file name for S3 key
 * @param {string} rideId associated ride id
 * @returns {Promise<string>} pre-signed S3 URL
 */
async function uploadInsurance(fileBuffer, fileName, rideId) {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error('S3_BUCKET env var required');

  const stream = Readable.from(fileBuffer);
  const params = {
    Bucket: bucket,
    Key: fileName,
    Body: stream,
  };

  const data = await s3.upload(params).promise();
  const url = await s3.getSignedUrlPromise('getObject', {
    Bucket: bucket,
    Key: fileName,
    Expires: 60 * 60, // 1 hour
  });

  const insert = `
    INSERT INTO insurance_docs (ride_id, url, uploaded_at)
    VALUES ($1, $2, NOW())
  `;
  await pool.query(insert, [rideId, url]);

  return url;
}

module.exports = uploadInsurance;
