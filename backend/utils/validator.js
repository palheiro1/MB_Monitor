/**
 * Data validation utilities
 */
const { logError } = require('./errorHandler');

/**
 * Validate request parameters
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware
 */
function validateRequest(schema) {
  return (req, res, next) => {
    try {
      // Combine all request inputs
      const data = {
        ...req.params,
        ...req.query,
        ...req.body
      };
      
      // Perform validation here (can be implemented with a library like Joi)
      const validationErrors = [];
      
      // Example validation
      if (schema.period && data.period) {
        const validPeriods = ['24h', '7d', '30d', 'all'];
        if (!validPeriods.includes(data.period)) {
          validationErrors.push(`Invalid period: ${data.period}`);
        }
      }
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: validationErrors
        });
      }
      
      next();
    } catch (error) {
      logError('Validation error', error);
      return res.status(500).json({
        status: 'error',
        message: 'Validation internal error'
      });
    }
  };
}

module.exports = { validateRequest };
