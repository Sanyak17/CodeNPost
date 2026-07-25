/**
 * Centralized error handler. Express recognizes this as an error-handling
 * middleware specifically because it takes 4 arguments (err, req, res, next) -
 * that's not a style choice, Express checks the function's arity to decide
 * whether to treat it as a normal middleware or an error handler.
 *
 * This is a safety net: every route already has its own try/catch for
 * expected failures (bad input, external API errors, etc.), but this catches
 * anything unexpected that slips through - a bug, an unhandled edge case -
 * so the server always responds with clean JSON instead of crashing or
 * leaking a raw stack trace to the client.
 */
function errorHandler(err, req, res, next) {
  console.error("[Unhandled Error]", err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? "Something went wrong on our end." : err.message,
  });
}

/**
 * Catches requests to routes that don't exist at all (e.g. a typo'd URL).
 * Must be registered AFTER all real routes but BEFORE errorHandler.
 */
function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };