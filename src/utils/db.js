const { PrismaClient, Prisma } = require('@prisma/client');
const { config } = require('../config/env');

const prisma = new PrismaClient();

const encryptedFields = {
  Patient: ['name', 'phone'],
  Ride: ['pickup_address', 'dropoff_address'],
};

const key = config.PATIENT_DATA_KEY;

prisma.$use(async (params, next) => {
  const fields = encryptedFields[params.model];
  if (fields && key) {
    if (['create', 'update'].includes(params.action) && params.args.data) {
      for (const field of fields) {
        if (params.args.data[field]) {
          params.args.data[field] =
            Prisma.sql`pgp_sym_encrypt(${params.args.data[field]}, ${key})::text`;
        }
      }
    }
  }

  const result = await next(params);

  if (fields && key && result) {
    const decryptRow = async (row) => {
      for (const f of fields) {
        if (row[f]) {
          const [r] =
            await prisma.$queryRaw`SELECT pgp_sym_decrypt(${row[f]}::bytea, ${key}) AS val`;
          row[f] = r.val;
        }
      }
    };

    if (Array.isArray(result)) {
      for (const r of result) await decryptRow(r);
    } else {
      await decryptRow(result);
    }
  }

  return result;
});

module.exports = { prisma };
