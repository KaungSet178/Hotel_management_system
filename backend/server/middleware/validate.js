/**
 * Request Validation Middleware for Hotel Management System
 * Uses Zod schemas to validate req.body, req.query, and req.params.
 * Formats standardized 400 Bad Request responses with detailed field failures.
 */

function validateRequest(schema) {
  return async (req, res, next) => {
    try {
      if (!schema) return next();

      const errors = [];

      // Case 1: Schema is a Zod schema
      if (typeof schema.safeParse === 'function') {
        const isCompound = schema.shape && (schema.shape.body || schema.shape.query || schema.shape.params);

        if (isCompound) {
          const result = schema.safeParse({
            body: req.body,
            query: req.query,
            params: req.params
          });

          if (!result.success) {
            return sendValidationError(res, result.error);
          }

          if (result.data.body) req.body = result.data.body;
          if (result.data.query) req.query = result.data.query;
          if (result.data.params) req.params = result.data.params;
          return next();
        } else {
          // Schema is directly for req.body
          const result = schema.safeParse(req.body);
          if (!result.success) {
            return sendValidationError(res, result.error);
          }
          req.body = result.data;
          return next();
        }
      }

      // Case 2: Schema is a plain object { body, query, params }
      const targets = ['body', 'query', 'params'];
      for (const target of targets) {
        if (schema[target] && typeof schema[target].safeParse === 'function') {
          const result = schema[target].safeParse(req[target]);
          if (!result.success) {
            const issues = result.error.issues || result.error.errors || [];
            const formatted = issues.map(err => ({
              target,
              field: Array.isArray(err.path) ? err.path.join('.') : (err.path || target),
              message: err.message,
              code: err.code
            }));
            errors.push(...formatted);
          } else {
            req[target] = result.data;
          }
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request input validation failed.',
            details: errors
          }
        });
      }

      return next();
    } catch (err) {
      next(err);
    }
  };
}

function sendValidationError(res, zodError) {
  const issues = (zodError && (zodError.issues || zodError.errors)) || [];
  const details = issues.map(err => ({
    field: Array.isArray(err.path) ? err.path.join('.') : (err.path || 'request'),
    message: err.message,
    code: err.code
  }));

  return res.status(400).json({
    success: false,
    code: 'VALIDATION_ERROR',
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request input validation failed.',
      details
    }
  });
}

module.exports = {
  validateRequest
};
