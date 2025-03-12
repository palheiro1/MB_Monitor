// ...existing code...

/**
 * Filter an array of objects by time period
 * @param {Array} data - Array of objects with timestamps
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @param {Object} options - Filter options
 * @returns {Array} Filtered array
 */
function filterByPeriod(data, period, options = {}) {
  // If no data or period is all, return all data
  if (!data || !Array.isArray(data) || data.length === 0 || period === 'all') {
    return data;
  }

  // Get field names for timestamps
  const timestampField = options.timestampField || 'timestamp';
  const dateField = options.dateField || 'date';
  
  // Get the cutoff date
  const cutoff = getPeriodCutoff(period);
  const cutoffDate = new Date(cutoff);
  
  // Filter data
  const filtered = data.filter(item => {
    // Try numeric timestamp field first
    if (item[timestampField]) {
      const timestamp = item[timestampField];
      if (timestamp > cutoff) {
        return true;
      }
    }
    
    // Try date string field
    if (item[dateField]) {
      const date = new Date(item[dateField]);
      if (!isNaN(date) && date > cutoffDate) {
        return true;
      }
    }
    
    // Check other common date fields
    const altDateFields = ['timestampISO', 'burnDate', 'craftDate', 'dateISO'];
    for (const field of altDateFields) {
      if (item[field]) {
        const date = new Date(item[field]);
        if (!isNaN(date) && date > cutoffDate) {
          return true;
        }
      }
    }
    
    return false;
  });
  
  return filtered;
}

// ...existing code...
