/**
 * Cache Utility Functions
 * 
 * Provides standardized cache keys and data formatting
 */
const { ARDOR_EPOCH } = require('../config');

// Standard cache key prefixes
const CACHE_PREFIXES = {
  ASSETS: 'ardor_assets',
  TRADES: 'ardor_trades',
  BURNS: 'ardor_card_burns',
  GEM_BURNS: 'ardor_gem_burns',
  CRAFTS: 'ardor_craftings',
  MORPHS: 'ardor_morphings',
  USERS: 'ardor_users',
  GIFTZ: 'ardor_giftz_sales'
};

/**
 * Create standardized cache key
 */
function createCacheKey(type, period = null) {
  const baseKey = CACHE_PREFIXES[type.toUpperCase()] || `ardor_${type.toLowerCase()}`;
  return period ? `${baseKey}_${period}` : baseKey;
}

/**
 * Normalize timestamp for consistent storage
 */
function normalizeTimestamp(timestamp) {
  // If it's a string, parse it
  if (typeof timestamp === 'string') {
    return new Date(timestamp).toISOString();
  }
  
  // If it's a small number, it's likely Ardor timestamp (seconds since Ardor epoch)
  if (timestamp < 1e10) {
    const jsTimestamp = ARDOR_EPOCH + (timestamp * 1000);
    return new Date(jsTimestamp).toISOString();
  }
  
  // Otherwise assume it's a JS timestamp (milliseconds since epoch)
  return new Date(timestamp).toISOString();
}

/**
 * Create period filter cutoff dates
 */
function getPeriodCutoff(period) {
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
  
  // Calculate Ardor timestamp (seconds since Ardor epoch)
  const ardorTimestamp = Math.floor((cutoffTime - ARDOR_EPOCH) / 1000);
  
  return {
    timestamp: cutoffTime,
    date: new Date(cutoffTime),
    ardorTimestamp,
    period
  };
}

/**
 * Create standard cache metadata
 */
function createCacheMetadata(period = null, recordCount = 0, customData = {}) {
  return {
    timestamp: new Date().toISOString(),
    period: period || 'all',
    count: recordCount,
    cacheVersion: 2,
    ...customData
  };
}

/**
 * Filter data by time period with improved timestamp handling
 * @param {Array} data - Data array to filter
 * @param {string} period - Period identifier (24h, 7d, 30d, all)
 * @param {Object} options - Field names for time data
 * @returns {Array} Filtered data
 */
function filterByPeriod(data, period, options = {}) {
  // If no data or period is 'all', return as is
  if (!data || !Array.isArray(data) || data.length === 0 || period === 'all') {
    console.log(`No filtering needed: data=${data?.length || 0} items, period=${period}`);
    return data;
  }
  
  console.log(`Filtering ${data.length} items by period ${period}`);
  
  const {
    timestampField = 'timestamp',  // Numeric timestamp field
    dateField = 'date',            // ISO date string field
    isoDateField = 'timestampISO'  // Alternative ISO date string field
  } = options;

  // Get cutoff timestamp based on period
  const now = new Date();
  let cutoffDate = new Date(now);
  
  switch (period) {
    case '24h':
      cutoffDate.setHours(now.getHours() - 24);
      break;
    case '7d':
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      cutoffDate.setDate(now.getDate() - 30);
      break;
    default:
      return data; // For 'all' or invalid periods, return all data
  }
  
  const cutoffTime = cutoffDate.getTime();
  const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();
  const cutoffArdorTimestamp = Math.floor((cutoffTime - ARDOR_EPOCH) / 1000);

  console.log(`Period filter details: cutoffDate=${cutoffDate.toISOString()}, cutoffTime=${cutoffTime}, cutoffArdorTimestamp=${cutoffArdorTimestamp}`);
  
  // Find latest date in data for debugging
  let latestDate = null;
  let latestTimestamp = 0;
  
  for (const item of data) {
    try {
      if (item[isoDateField]) {
        const date = new Date(item[isoDateField]);
        if (!isNaN(date) && (!latestDate || date > latestDate)) {
          latestDate = date;
        }
      } else if (item[dateField]) {
        const date = new Date(item[dateField]);
        if (!isNaN(date) && (!latestDate || date > latestDate)) {
          latestDate = date;
        }
      } else if (item[timestampField]) {
        const ts = Number(item[timestampField]);
        if (!isNaN(ts)) {
          if (ts < 1e10) { // Ardor timestamp
            const date = new Date(ARDOR_EPOCH + (ts * 1000));
            if (!latestDate || date > latestDate) {
              latestDate = date;
              latestTimestamp = ts;
            }
          } else { // JS timestamp
            const date = new Date(ts);
            if (!latestDate || date > latestDate) {
              latestDate = date;
              latestTimestamp = ts;
            }
          }
        }
      }
    } catch (e) {
      // Skip errors in date detection
    }
  }

  if (latestDate) {
    console.log(`Detected latest data timestamp is ${latestDate.toISOString()}`);
  }

  // Filter data with improved timestamp handling
  const filtered = data.filter(item => {
    if (!item) return false;
    
    // Try multiple timestamp formats
    try {
      // Try ISO date string fields first
      if (item[isoDateField]) {
        const date = new Date(item[isoDateField]);
        if (!isNaN(date.getTime())) {
          return date >= cutoffDate;
        }
      }
      
      if (item[dateField]) {
        const date = new Date(item[dateField]);
        if (!isNaN(date.getTime())) {
          return date >= cutoffDate;
        }
      }
      
      // Try timestamp field (numeric)
      if (item[timestampField] !== undefined) {
        const timestamp = Number(item[timestampField]);
        if (!isNaN(timestamp)) {
          // Check if it's Ardor timestamp (seconds since Ardor epoch)
          if (timestamp < 1e10) {
            return timestamp >= cutoffArdorTimestamp;
          } else {
            // Assume it's JS timestamp (milliseconds since Unix epoch)
            return timestamp >= cutoffTime;
          }
        }
        
        // Try parsing timestamp as string date
        const date = new Date(item[timestampField]);
        if (!isNaN(date.getTime())) {
          return date >= cutoffDate;
        }
      }
      
      // If we have a different date field, try it
      const dateCandidates = Object.keys(item).filter(
        key => key.toLowerCase().includes('date') || 
              key.toLowerCase().includes('time')
      );
      
      for (const key of dateCandidates) {
        if (key !== timestampField && key !== dateField && key !== isoDateField) {
          if (typeof item[key] === 'string') {
            try {
              const date = new Date(item[key]);
              if (!isNaN(date.getTime())) {
                return date >= cutoffDate;
              }
            } catch (e) {
              // Skip this field on error
            }
          } else if (typeof item[key] === 'number') {
            const ts = item[key];
            if (ts < 1e10) { // Ardor timestamp
              return ts >= cutoffArdorTimestamp;
            } else { // JS timestamp
              return ts >= cutoffTime;
            }
          }
        }
      }
      
    } catch (e) {
      console.warn(`Error filtering item:`, e);
    }
    
    // If we can't determine the date but item has some date fields, log it
    const timeKeys = Object.keys(item).filter(
      key => key.toLowerCase().includes('date') || 
            key.toLowerCase().includes('time')
    );
    
    if (timeKeys.length > 0) {
      const timeValues = {};
      timeKeys.forEach(key => timeValues[key] = item[key]);
      console.debug(`Could not filter item with time fields:`, timeValues);
    }
    
    // Default to include if we can't determine (avoid data loss)
    return true;
  });

  console.log(`Filtered from ${data.length} to ${filtered.length} items`);
  return filtered;
}

// Create an alias for filterByPeriod to maintain backward compatibility
const filterDataByPeriod = filterByPeriod;

module.exports = {
  CACHE_PREFIXES,
  createCacheKey,
  normalizeTimestamp,
  getPeriodCutoff,
  createCacheMetadata,
  filterByPeriod,
  filterDataByPeriod
};
