/**
 * Centralized error handling utilities
 */

/**
 * Log error with consistent format
 * @param {string} context - Context where error occurred
 * @param {Error} error - Error object
 * @param {Object} additionalInfo - Any additional information
 */
function logError(context, error, additionalInfo = {}) {
  console.error(`[ERROR] ${context}: ${error.message}`, {
    stack: error.stack,
    ...additionalInfo
  });
}

/**
 * Create a standardized API error response
 * @param {Error} error - Original error
 * @param {string} userMessage - User-friendly message
 * @returns {Object} Formatted error object
 */
function formatApiError(error, userMessage = null) {
  return {
    status: 'error',
    message: userMessage || error.message,
    errorCode: error.code || 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString()
  };
}

/**
 * Middleware for handling API errors
 */
function errorMiddleware(err, req, res, next) {
  logError(`API Error: ${req.method} ${req.path}`, err, {
    requestBody: req.body,
    requestParams: req.params,
    requestQuery: req.query
  });
  
  res.status(err.statusCode || 500).json(
    formatApiError(err, 'An error occurred processing your request')
  );
}

module.exports = {
  logError,
  formatApiError,
  errorMiddleware
};
