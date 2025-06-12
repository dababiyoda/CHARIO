const AWS = require('aws-sdk');
const { prisma } = require('../../utils/db');
const { Readable } = require('stream');

const { config } = require('../../config/env');
const s3 = new AWS.S3();

/**
 * Streams a file to S3 and stores metadata in insurance_docs.
 * @param {Buffer} fileBuffer the file contents
 * @param {string} fileName file name for S3 key
 * @param {string} rideId associated ride id
 * @returns {Promise<string>} pre-signed download URL
 */
async function uploadInsurance(fileBuffer, fileName, rideId) {
  const bucket = config.S3_BUCKET;
  if (!bucket) throw new Error('S3_BUCKET env var required');

  const stream = Readable.from(fileBuffer);
  const params = {
    Bucket: bucket,
    Key: fileName,
    Body: stream,
    ACL: 'private'
  };

  await s3.upload(params).promise();
  const url = s3.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: fileName,
    Expires: 60 * 60
  });

  await prisma.insuranceDoc.create({
    data: { ride_id: rideId, s3_key: fileName }
  });

  return url;
}

module.exports = uploadInsurance;
