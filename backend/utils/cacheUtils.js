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
 * Filter data by time period
 */
function filterByPeriod(data, period, options = {}) {
  if (!Array.isArray(data) || period === 'all') {
    return data;
  }
  
  const {
    timestampField = 'timestamp',
    dateField = 'date',
    isoDateField = 'timestampISO'
  } = options;
  
  const cutoff = getPeriodCutoff(period);
  
  return data.filter(item => {
    // Try different date/timestamp fields
    if (item[isoDateField]) {
      return new Date(item[isoDateField]) >= cutoff.date;
    } 
    
    if (item[dateField]) {
      return new Date(item[dateField]) >= cutoff.date;
    }
    
    if (item[timestampField]) {
      // If it's an Ardor timestamp (seconds since Ardor epoch)
      if (item[timestampField] < 1e10) {
        return item[timestampField] >= cutoff.ardorTimestamp;
      }
      // Otherwise assume it's a JS timestamp (milliseconds)
      return item[timestampField] >= cutoff.timestamp;
    }
    
    // If we can't determine the time, include by default
    return true;
  });
}

module.exports = {
  CACHE_PREFIXES,
  createCacheKey,
  normalizeTimestamp,
  getPeriodCutoff,
  createCacheMetadata,
  filterByPeriod
};
