const express = require('express');
const { authenticate } = require('../auth/service');
const { getInsuranceUrl } = require('./service');
const { getLogger } = require('../../utils/logger');

const log = getLogger(__filename);

function createInsuranceRouter() {
  const router = express.Router();

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
