const { ZodError } = require('zod');

function validate(schema, parse = 'body') {
  return (req, res, next) => {
    try {
      req[parse] = schema.parse(req[parse]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
      }
      next(err);
    }
  };
}

module.exports = validate;
