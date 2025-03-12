/**
 * Cache Manager
 * Unified caching system for all MB Monitor data
 */
const fs = require('fs');
const path = require('path');
const { readJSON, writeJSON } = require('./jsonStorage');
const cacheService = require('../services/cacheService');

// Define constants
const CACHE_DIR = path.join(__dirname, '../storage');
const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();

/**
 * Get all cache files in the storage directory
 * @returns {Promise<Array>} List of cache file information
 */
async function listCacheFiles() {
  try {
    // Ensure storage directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      return [];
    }
    
    // Read all JSON files in the directory
    const files = fs.readdirSync(CACHE_DIR)
      .filter(filename => filename.endsWith('.json'))
      .map(filename => {
        const filePath = path.join(CACHE_DIR, filename);
        const stats = fs.statSync(filePath);
        
        // Extract basic file info
        const fileInfo = {
          filename,
          path: filePath,
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime,
          records: 0,
          periodBased: filename.match(/_(?:24h|7d|30d|all)\.json$/) !== null
        };
        
        // Try to read and analyze the file content
        try {
          const data = readJSON(filename.replace('.json', ''));
          if (data) {
            // Different files store their data in different structures
            if (Array.isArray(data)) {
              fileInfo.records = data.length;
              fileInfo.type = 'array';
            } else if (data.count !== undefined) {
              fileInfo.records = data.count;
              fileInfo.type = 'count-object';
            } else {
              // Check common array properties
              const arrayProps = ['burns', 'sales', 'trades', 'transfers', 'users', 'craftings', 'morphs'];
              for (const prop of arrayProps) {
                if (Array.isArray(data[prop])) {
                  fileInfo.records = data[prop].length;
                  fileInfo.type = `${prop}-object`;
                  break;
                }
              }
            }
            
            // Extract timestamp if available
            fileInfo.timestamp = data.timestamp;
            
            // Extract period if found in filename
            const periodMatch = filename.match(/_(?:24h|7d|30d|all)\.json$/);
            if (periodMatch) {
              fileInfo.period = periodMatch[0].replace('_', '').replace('.json', '');
            } else {
              fileInfo.period = null;
            }
          }
        } catch (error) {
          console.error(`Error analyzing cache file ${filename}:`, error.message);
        }
        
        return fileInfo;
      });
    
    return files;
  } catch (error) {
    console.error('Error listing cache files:', error);
    return [];
  }
}

/**
 * Delete a specific cache file
 * @param {string} filename - Cache file name (with or without .json extension)
 * @returns {Promise<Object>} Result of the operation
 */
async function clearCacheFile(filename) {
  try {
    const baseName = filename.endsWith('.json') ? filename : `${filename}.json`;
    const filePath = path.join(CACHE_DIR, baseName);
    
    if (!fs.existsSync(filePath)) {
      return { 
        success: false, 
        message: `Cache file ${baseName} not found` 
      };
    }
    
    fs.unlinkSync(filePath);
    return {
      success: true,
      message: `Successfully cleared cache file ${baseName}`
    };
  } catch (error) {
    console.error(`Error clearing cache file ${filename}:`, error);
    return { 
      success: false, 
      message: `Error clearing cache: ${error.message}` 
    };
  }
}

/**
 * Clear all cache files
 * @returns {Promise<Object>} Result of the operation
 */
async function clearAllCaches() {
  try {
    const files = await listCacheFiles();
    const results = [];
    
    for (const file of files) {
      try {
        fs.unlinkSync(file.path);
        results.push({
          filename: file.filename,
          success: true
        });
      } catch (error) {
        results.push({
          filename: file.filename,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      success: true,
      cleared: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  } catch (error) {
    console.error('Error clearing all caches:', error);
    return { 
      success: false, 
      message: `Error clearing caches: ${error.message}` 
    };
  }
}

/**
 * Get period cutoff timestamp
 * @param {string} period - Period identifier (24h, 7d, 30d, all)
 * @returns {Object} Cutoff info with timestamp and date
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
  
  // Also calculate Ardor timestamp (seconds since Ardor epoch)
  const ardorTimestamp = Math.floor((cutoffTime - ARDOR_EPOCH) / 1000);
  
  return {
    timestamp: cutoffTime,
    date: new Date(cutoffTime),
    ardorTimestamp
  };
}

/**
 * Filter data array by period
 * @param {Array} data - Data array to filter
 * @param {string} period - Period to filter by
 * @param {Object} options - Filter options
 * @returns {Array} Filtered data
 */
function filterDataByPeriod(data, period, options = {}) {
  if (!Array.isArray(data) || period === 'all') {
    return data;
  }
  
  const {
    timestampField = 'timestamp',
    dateField = 'date',
    isoDateField = 'timestampISO',
    debug = false
  } = options;
  
  // Get the cutoff date/time based on period
  const cutoff = getPeriodCutoff(period);
  
  console.log(`Filtering ${data.length} items by period ${period}`);
  console.log(`Period filter details: cutoffDate=${cutoff.date.toISOString()}, cutoffTime=${cutoff.timestamp}, cutoffArdorTimestamp=${cutoff.ardorTimestamp}`);
  
  // Log an example of the latest data timestamp if available
  if (data.length > 0) {
    // Find the item with the latest timestamp
    let latestItem = data[0];
    for (const item of data) {
      if (item[timestampField] > latestItem[timestampField]) {
        latestItem = item;
      }
    }
    
    let latestDateStr = "unknown";
    if (latestItem[isoDateField]) {
      latestDateStr = latestItem[isoDateField];
    } else if (latestItem[dateField]) {
      latestDateStr = new Date(latestItem[dateField]).toISOString();
    } else if (latestItem[timestampField]) {
      // Convert from Ardor timestamp if it's small enough
      if (latestItem[timestampField] < 1e10) {
        latestDateStr = new Date(ARDOR_EPOCH + (latestItem[timestampField] * 1000)).toISOString();
      } else {
        latestDateStr = new Date(latestItem[timestampField]).toISOString();
      }
    }
    
    console.log(`Detected latest data timestamp is ${latestDateStr}`);
  }
  
  // For morphs data, do an initial check for quantity fields
  if (data.length > 0 && data[0].hasOwnProperty('quantity')) {
    const morphsWithQuantity = data.filter(item => item.quantity > 1).length;
    console.log(`Before filtering: ${data.length} items, ${morphsWithQuantity} with quantity > 1`);
  }
  
  // Apply the filtering
  const filteredData = data.filter(item => {
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
    
    // If we can't determine the time, include the item by default
    return true;
  });
  
  console.log(`Filtered from ${data.length} to ${filteredData.length} items`);
  
  // For morphs data, do a final check for quantity fields after filtering
  if (filteredData.length > 0 && filteredData[0].hasOwnProperty('quantity')) {
    const morphsWithQuantity = filteredData.filter(item => item.quantity > 1).length;
    console.log(`After filtering: ${filteredData.length} items, ${morphsWithQuantity} with quantity > 1`);
    
    // Calculate total quantity for fields with quantity property
    const totalQuantity = filteredData.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 1), 0);
    console.log(`Total quantity after filtering: ${totalQuantity}`);
  }
  
  return filteredData;
}

/**
 * Check if cache is valid by timestamp
 * @param {Object} cacheData - Cache data to check
 * @returns {boolean} True if cache is valid, false otherwise
 */
function isCacheValid(cacheData) {
  if (!cacheData || !cacheData.timestamp) return false;
  
  const cacheTime = new Date(cacheData.timestamp).getTime();
  const now = Date.now();
  
  // Cache is invalid if timestamp is in the future
  if (cacheTime > now) {
    console.warn('Cache has future timestamp, invalidating:', cacheData.timestamp);
    return false;
  }
  
  return true;
}

/**
 * Get cached data with smart refresh policy
 * 
 * @param {string} dataType - Type of data (e.g., 'trades', 'morphs')
 * @param {Function} fetchFunction - Function to fetch data if cache is invalid
 * @param {Object} options - Options for caching
 * @returns {Promise<Object>} The cached or freshly fetched data
 */
async function getCachedData(dataType, fetchFunction, options = {}) {
  const {
    forceRefresh = false,
    cacheFile = `ardor_${dataType}`,
    cacheTTLSeconds = 3600, // 1 hour default
    period = 'all',
    dataArrayField
  } = options;

  try {
    // Make a standard cache key
    const cacheKey = dataType.includes('ardor_') ? dataType : `ardor_${dataType}`;
    
    // Check if we need to write debug info
    const debug = options.debug || process.env.DEBUG;
    
    if (debug) {
      console.log(`getCachedData: type=${dataType}, force=${forceRefresh}, file=${cacheFile}`);
    }

    // First check if data is in the cache and not forced to refresh
    if (!forceRefresh) {
      const cachedData = cacheService.file.read(cacheKey);
      
      if (cachedData && cacheService.isCacheValid(cachedData, cacheTTLSeconds)) {
        if (debug) {
          console.log(`Using cached ${dataType} data from ${cacheKey}.json`);
        }
        
        // Special handling for morphs data - if it's completely empty, don't use the cache
        if (dataType === 'morphs' && 
            (!Array.isArray(cachedData.morphs) || cachedData.morphs.length === 0)) {
          console.log('Cache exists but has empty morphs array - refreshing data');
        } else {
          return cachedData;
        }
      }
    }

    if (debug) {
      console.log(`Cache invalid or refresh forced for ${dataType}, fetching fresh data...`);
    }

    // Validate that fetchFunction is actually a function
    if (typeof fetchFunction !== 'function') {
      throw new TypeError(`fetchFunction for ${dataType} must be a function, got ${typeof fetchFunction}`);
    }

    // If not in cache or forced to refresh, fetch fresh data
    const data = await fetchFunction(options.period);

    // Enhancement: Add timestamp if not present
    if (!data.timestamp) {
      data.timestamp = new Date().toISOString();
    }
    
    // If this is morphs data, ensure we have at least one item before storing in cache
    if (dataType === 'morphs' && dataArrayField && 
        (!Array.isArray(data[dataArrayField]) || data[dataArrayField].length === 0)) {
      console.log(`Warning: ${dataType} data was fetched but returned empty array. Not caching.`);
      return data;
    }

    // Store in cache
    cacheService.file.write(cacheKey, data);
    
    if (debug) {
      console.log(`Successfully wrote cache to ${path.join(process.cwd(), 'backend/storage', cacheKey + '.json')}`);
    }

    return data;
  } catch (error) {
    console.error(`Error in getCachedData for ${dataType}:`, error);
    
    // Try to return cached data even if it's expired in case of fetch error
    const cacheKey = dataType.includes('ardor_') ? dataType : `ardor_${dataType}`;
    const cachedData = cacheService.file.read(cacheKey);
    
    if (cachedData) {
      console.log(`Returning expired cached data for ${dataType} after fetch error`);
      return {
        ...cachedData,
        fromExpiredCache: true,
        fetchError: error.message
      };
    }
    
    throw error;
  }
}

/**
 * Apply period filter to data object or array
 * @param {Object|Array} data - Data to filter
 * @param {string} period - Period for filtering
 * @param {Object} options - Filter options
 * @returns {Object|Array} Filtered data
 */
function applyPeriodFilter(data, period, options = {}) {
  // If period is "all", return data as-is
  if (period === 'all') {
    return data;
  }
  
  // If data is an array, filter directly
  if (Array.isArray(data)) {
    return filterDataByPeriod(data, period, options);
  }
  
  // If data is an object, create a new object to prevent mutation
  const result = { ...data };
  
  // Determine which array fields to filter
  const dataArrayField = options.dataArrayField || Object.keys(data).find(key => Array.isArray(data[key]));
  
  // If specific array field was provided and exists
  if (dataArrayField && Array.isArray(data[dataArrayField])) {
    result[dataArrayField] = filterDataByPeriod(
      data[dataArrayField], 
      period, 
      options
    );
    
    // Update count if present
    if (result.count !== undefined) {
      result.count = result[dataArrayField].length;
    }
  } else {
    // Otherwise find and filter all array fields
    Object.keys(result).forEach(key => {
      if (Array.isArray(result[key])) {
        result[key] = filterDataByPeriod(result[key], period, options);
      }
    });
    
    // Update count field if it exists
    if (result.count !== undefined) {
      // Find the main data array to use for count
      const mainArray = Object.keys(result)
        .find(key => Array.isArray(result[key]) && key !== 'count');
      
      if (mainArray) {
        result.count = result[mainArray].length;
      }
    }
  }
  
  // Update period in result
  result.period = period;
  
  return result;
}

// Export all functions
module.exports = {
  listCacheFiles,
  clearCacheFile,
  clearAllCaches,
  getPeriodCutoff,
  filterDataByPeriod,
  getCachedData,
  applyPeriodFilter,
  writeJSON, // Re-export writeJSON for convenience
  readJSON,   // Re-export readJSON for convenience
  isCacheValid // Export the new function
};
