const AWS = require('aws-sdk');
const { config } = require('../config/env');

const s3 = new AWS.S3({
  endpoint: config.S3_ENDPOINT || undefined,
  accessKeyId: config.S3_ACCESS_KEY || undefined,
  secretAccessKey: config.S3_SECRET_KEY || undefined,
  s3ForcePathStyle: !!config.S3_ENDPOINT,
  signatureVersion: 'v4'
});

async function putObject(key, body) {
  if (!config.S3_BUCKET) {
    throw new Error('S3_BUCKET env var required');
  }
  await s3
    .putObject({
      Bucket: config.S3_BUCKET,
      Key: key,
      Body: body,
      ACL: 'private'
    })
    .promise();
}

function getPresignedUrl(key) {
  if (!config.S3_BUCKET) {
    throw new Error('S3_BUCKET env var required');
  }
  return s3.getSignedUrl('getObject', {
    Bucket: config.S3_BUCKET,
    Key: key,
    Expires: 60 * 10
  });
}

module.exports = { putObject, getPresignedUrl };
