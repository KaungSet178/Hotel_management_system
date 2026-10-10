const { rateLimit } = require('express-rate-limit');

/**
 * Standard error response handler formatting rate-limit rejections
 * into the unified Phase 3 API error envelope.
 */
const rateLimitHandler = (req, res, next, options) => {
  const windowSec = Math.round(options.windowMs / 1000);
  const maxReq = options.limit || options.max;
  res.status(429).json({
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down and try again later.',
      details: [
        {
          field: null,
          message: `Rate limit exceeded. Maximum ${maxReq} requests allowed per ${windowSec} seconds.`
        }
      ]
    }
  });
};

/**
 * Standard key generator supporting x-client-id or x-forwarded-for
 * to enable deterministic automated testing isolation alongside client IP tracking.
 */
const keyGenerator = (req) => {
  return req.headers['x-client-id'] || req.ip || '127.0.0.1';
};

/**
 * Global Rate Limiter:
 * Baseline protection across all API routes (100 requests per 15 minutes by default).
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: parseInt(process.env.GLOBAL_RATE_LIMIT, 10) || (process.env.NODE_ENV === 'test' ? 1000 : 100),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator,
  handler: rateLimitHandler
});

/**
 * Strict Rate Limiter:
 * Applied to high-sensitivity endpoints (e.g. POST /api/check-in/scan and POST /api/bookings).
 * Defaults to 10 requests per minute, isolated per route endpoint.
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: parseInt(process.env.STRICT_RATE_LIMIT, 10) || 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => `${keyGenerator(req)}:${req.baseUrl || ''}${req.path || ''}`,
  handler: rateLimitHandler
});

module.exports = {
  globalLimiter,
  strictLimiter
};
