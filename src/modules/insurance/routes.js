const express = require('express');
const { authenticate } = require('../auth/service');
const { getInsuranceUrl, uploadInsurance } = require('./service');
const { getLogger } = require('../../utils/logger');
const {
  validate,
  insuranceClaimSchema,
} = require('../../utils/middleware/validate');

const log = getLogger(__filename);

function createInsuranceRouter() {
  const router = express.Router();
  router.use(express.json());

  router.post(
    '/insurance/claim',
    validate(insuranceClaimSchema),
    async (req, res) => {
      try {
        const { rideId, fileName, file } = req.validated.body;
        await uploadInsurance(Buffer.from(file, 'base64'), fileName, rideId);
        res.status(201).json({ ok: true });
      } catch (err) {
        log.error({ err }, 'failed to upload insurance');
        res.status(500).json({ error: 'internal server error' });
      }
    },
  );

  router.get('/insurance/:id', authenticate, async (req, res) => {
    try {
      const url = await getInsuranceUrl(req.params.id);
      res.json({ url });
    } catch (err) {
      if (err.message === 'document not found') {
        return res.status(404).json({ error: 'not found' });
      }
      log.error({ err }, 'failed to generate insurance url');
      return res.status(500).json({ error: 'internal server error' });
    }
  });

  return router;
}

module.exports = createInsuranceRouter;
