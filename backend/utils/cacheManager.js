/**
 * Cache Manager
 * Unified caching system for all MB Monitor data
 */
const fs = require('fs');
const path = require('path');
const { readJSON, writeJSON } = require('./jsonStorage');

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
    
    // If we can't determine the time, include the item by default
    return true;
  });
}

/**
 * Get cached data with unified approach
 */
async function getCachedData(dataType, period, fetchFunction, forceRefresh = false, options = {}) {
  // Normalize the data type to ensure consistent naming
  dataType = dataType.replace(/^giftz_/, 'giftz_');  // Correct potential gift_ to giftz_
  
  // Define unified cache key without period suffix
  const cacheKey = `ardor_${dataType}`;
  
  // Define filter options based on data type
  const filterOptions = {
    users: { 
      timestampField: 'timestamp',
      dateField: 'last_seen',
      isoDateField: 'timestampISO',
      dataArrayField: 'ardor_users'
    },
    trades: {
      timestampField: 'timestamp',
      dateField: 'date',
      isoDateField: 'timestampISO',
      dataArrayField: 'ardor_trades'
    },
    // Add other data types as needed
    ...options
  };
  
  try {
    // Check if cache exists and is valid
    const cacheData = readJSON(cacheKey);
    
    // If we need fresh data (forced refresh or no cache)
    if (forceRefresh || !cacheData) {
      console.log(`Fetching fresh ${dataType} data (forceRefresh=${forceRefresh})`);
      
      // Get fresh data using the provided function
      const freshData = await fetchFunction();
      
      // Save to cache
      writeJSON(cacheKey, freshData);
      
      // Filter and return based on period
      return applyPeriodFilter(freshData, period, filterOptions[dataType] || {});
    }
    
    console.log(`Using cached ${dataType} data with period filter: ${period}`);
    
    // Filter and return cached data based on period
    return applyPeriodFilter(cacheData, period, filterOptions[dataType] || {});
  } catch (error) {
    console.error(`Error handling cached data for ${dataType}:`, error);
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
  applyPeriodFilter
};
