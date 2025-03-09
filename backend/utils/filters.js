/**
 * Filter data by time period
 * @param {Array} data - Array of data objects
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @param {string} timestampField - Field name containing timestamp
 * @returns {Array} Filtered data
 */
function filterByPeriod(data, period = 'all', timestampField = 'timestamp') {
  if (!data || !Array.isArray(data) || period === 'all') {
    return data;
  }
  
  const now = Date.now();
  const ardorEpoch = new Date("2018-01-01T00:00:00Z").getTime();
  
  // Calculate cutoff time in milliseconds
  let cutoffTime;
  switch (period) {
    case '24h':
      cutoffTime = now - 24 * 60 * 60 * 1000;
      break;
    case '7d':
      cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case '30d':
      cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
      break;
    default:
      return data;
  }
  
  // Convert cutoff time to Ardor seconds since epoch
  const cutoffArdorTimestamp = Math.floor((cutoffTime - ardorEpoch) / 1000);
  
  // Filter data based on timestamp
  return data.filter(item => {
    if (!item || typeof item[timestampField] === 'undefined') {
      return false;
    }
    const itemTimestamp = Number(item[timestampField]);
    return itemTimestamp >= cutoffArdorTimestamp;
  });
}

module.exports = { filterByPeriod };
