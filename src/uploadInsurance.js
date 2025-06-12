const AWS = require('aws-sdk');
const { Pool } = require('pg');

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
});

const pool = new Pool();
const BUCKET = process.env.S3_BUCKET;

/**
 * Upload an insurance document to S3 and record its location in the database.
 *
 * @param {string} rideId - ID of the ride the document belongs to
 * @param {Buffer|Uint8Array} fileBuffer - File contents to upload
 * @param {string} fileName - Name of the file to store in S3
 * @returns {Promise<string>} public URL of the uploaded document
 */
async function uploadInsurance(rideId, fileBuffer, fileName) {
  if (!rideId) throw new Error('rideId is required');
  if (!fileBuffer) throw new Error('fileBuffer is required');
  if (!fileName) throw new Error('fileName is required');
  if (!BUCKET) throw new Error('S3_BUCKET env var is required');

  const s3Key = `insurance/${rideId}/${Date.now()}-${fileName}`;

  const uploadParams = {
    Bucket: BUCKET,
    Key: s3Key,
    Body: fileBuffer,
    ACL: 'public-read',
  };

  // Upload to S3
  const { Location: url } = await s3.upload(uploadParams).promise();

  // Record in the database
  await pool.query(
    'INSERT INTO insurance_docs (ride_id, url, uploaded_at) VALUES ($1, $2, NOW())',
    [rideId, url]
  );

  return url;
}

module.exports = uploadInsurance;
