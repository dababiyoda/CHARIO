const { prisma } = require('../../utils/db');
const { Readable } = require('stream');

const { config } = require('../../config/env');
const { putObject, getPresignedUrl } = require('../../utils/s3');

/**
 * Streams a file to S3 and stores metadata in insurance_docs.
 * @param {Buffer} fileBuffer the file contents
 * @param {string} fileName file name for S3 key
 * @param {string} rideId associated ride id
 * @returns {Promise<void>} resolves when upload completes
 */
async function uploadInsurance(fileBuffer, fileName, rideId) {
  const bucket = config.S3_BUCKET;
  if (!bucket) throw new Error('S3_BUCKET env var required');

  const stream = Readable.from(fileBuffer);
  await putObject(fileName, stream);

  await prisma.insuranceDoc.create({
    data: { ride_id: rideId, s3_key: fileName }
  });
}

/**
 * Get a presigned URL for downloading an insurance document.
 * @param {string} docId insurance document id
 * @returns {Promise<string>} pre-signed URL
 */
async function getInsuranceUrl(docId) {
  const doc = await prisma.insuranceDoc.findUnique({
    where: { id: docId }
  });
  if (!doc) throw new Error('document not found');
  return getPresignedUrl(doc.s3_key);
}

module.exports = { uploadInsurance, getInsuranceUrl };
