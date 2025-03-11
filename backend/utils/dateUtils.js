/**
 * Date and timestamp utility functions
 */
const { ARDOR_EPOCH } = require('../config');

/**
 * Convert Ardor timestamp to JavaScript Date
 * @param {number} timestamp - Ardor timestamp (seconds since Ardor epoch)
 * @returns {Date} JavaScript Date object
 */
function ardorTimestampToDate(timestamp) {
  return new Date(ARDOR_EPOCH + (timestamp * 1000));
}

/**
 * Convert Ardor timestamp to ISO date string
 * @param {number} timestamp - Ardor timestamp (seconds since Ardor epoch)
 * @returns {string} ISO date string
 */
function ardorTimestampToISODate(timestamp) {
  return ardorTimestampToDate(timestamp).toISOString();
}

/**
 * Get period cutoff timestamp for filtering
 * @param {string} period - Period identifier (24h, 7d, 30d, all)
 * @param {boolean} isArdorTimestamp - Whether to return as Ardor timestamp
 * @returns {number} Cutoff timestamp
 */
function getPeriodCutoff(period, isArdorTimestamp = false) {
  const now = Date.now();
  let cutoffTime;
  
  switch (period) {
    case '24h':
      cutoffTime = now - (24 * 60 * 60 * 1000);
      break;
    case '7d':
      cutoffTime = now - (7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      cutoffTime = now - (30 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
    default:
      cutoffTime = 0; // Beginning of time
      break;
  }
  
  // Convert to Ardor timestamp if requested
  if (isArdorTimestamp) {
    return Math.floor((cutoffTime - ARDOR_EPOCH) / 1000);
  }
  
  return cutoffTime;
}

/**
 * Generate date range between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array<Date>} Array of dates
 */
function generateDateRange(startDate, endDate) {
  const dates = [];
  const currentDate = new Date(startDate);
  
  // Set to start of day
  currentDate.setHours(0, 0, 0, 0);
  
  // Set end date to end of day
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  while (currentDate <= endOfDay) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

/**
 * Extract date part from timestamp
 * @param {number|string} timestamp - Timestamp or ISO date
 * @returns {string} YYYY-MM-DD formatted date
 */
function extractDatePart(timestamp) {
  try {
    let date;
    
    if (typeof timestamp === 'string') {
      // ISO date or other string format
      date = new Date(timestamp);
    } else if (timestamp) {
      // Check if it's an Ardor timestamp (seconds)
      date = timestamp < 1e10 
        ? ardorTimestampToDate(timestamp) 
        : new Date(timestamp);
    } else {
      return null;
    }
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error extracting date part:', error);
    return null;
  }
}

module.exports = {
  ardorTimestampToDate,
  ardorTimestampToISODate,
  getPeriodCutoff,
  generateDateRange,
  extractDatePart
};
