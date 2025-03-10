/**
 * Middleware to ensure proper JSON responses
 * 
 * This middleware intercepts the response and ensures that JSON is properly formatted
 * and has appropriate headers before sending to the client.
 */

module.exports = function jsonResponseMiddleware(req, res, next) {
  // Store the original res.json method
  const originalJson = res.json;
  
  // Override res.json to ensure proper Content-Type and formatting
  res.json = function(obj) {
    // Set proper Content-Type header
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // Convert to JSON string manually to catch errors early
    let jsonString;
    try {
      jsonString = JSON.stringify(obj);
      
      // Log the response for debugging
      console.log(`JSON Response for ${req.path}: ${jsonString.substring(0, 100)}${jsonString.length > 100 ? '...' : ''}`);
      
      // Send the response
      return res.send(jsonString);
    } catch (error) {
      console.error('Error converting response to JSON:', error);
      
      // Send error response
      res.status(500).send(JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to serialize response to JSON'
      }));
    }
  };
  
  next();
};
