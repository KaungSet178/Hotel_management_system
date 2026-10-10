/**
 * Global Centralized Express Error Handling Middleware
 * Intercepts uncaught errors, standardizes response payloads,
 * and prevents stack trace leakage in production mode.
 */

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || err.statusCode || (
    err.code === 'DATES_UNAVAILABLE' ? 409 :
    err.code === 'UNAUTHORIZED' ? 401 :
    err.code === 'FORBIDDEN' || err.code === 'FORBIDDEN_GUEST' ? 403 :
    err.code === 'BOOKING_NOT_FOUND' || err.code === 'ROOM_NOT_FOUND' ? 404 :
    err.code === 'VALIDATION_ERROR' || err.code === 'INVALID_PROVIDER' || err.code === 'ALREADY_PAID' || err.code === 'INVALID_TOKEN' || err.code === 'ALREADY_CHECKED_IN' ? 400 :
    500
  );

  const code = err.code || (
    statusCode === 400 ? 'BAD_REQUEST' :
    statusCode === 401 ? 'UNAUTHORIZED' :
    statusCode === 403 ? 'FORBIDDEN' :
    statusCode === 404 ? 'NOT_FOUND' :
    statusCode === 409 ? 'CONFLICT' :
    'INTERNAL_SERVER_ERROR'
  );

  const message = err.message || 'An unexpected internal error occurred.';
  const details = err.details || (err.errors ? err.errors : []);

  const responsePayload = {
    success: false,
    code,
    error: {
      code,
      message,
      details: Array.isArray(details) ? details : [details]
    }
  };

  // Stack traces are strictly hidden in production mode
  if (process.env.NODE_ENV !== 'production' && statusCode === 500 && err.stack) {
    responsePayload.error.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
}

module.exports = {
  errorHandler
};
