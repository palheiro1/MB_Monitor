/**
 * Cache Migration Utility
 * Helps migrate from period-specific cache files to unified cache
 */
const fs = require('fs');
const path = require('path');
const { readJSON, writeJSON } = require('./jsonStorage');

// Storage directory
const STORAGE_DIR = path.join(__dirname, '../storage');

/**
 * List all cache files in storage directory
 * @returns {Array} List of cache files with metadata
 */
function listAllCacheFiles() {
  try {
    const files = fs.readdirSync(STORAGE_DIR)
      .filter(filename => filename.endsWith('.json'))
      .map(filename => {
        const filePath = path.join(STORAGE_DIR, filename);
        const stats = fs.statSync(filePath);
        
        return {
          filename,
          path: filePath,
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime,
          isPeriodSpecific: filename.includes('_24h') || 
                           filename.includes('_7d') || 
                           filename.includes('_30d') || 
                           filename.includes('_all')
        };
      });
    
    return files;
  } catch (error) {
    console.error('Error listing cache files:', error);
    return [];
  }
}

/**
 * Mapping between data types and actual file prefixes
 */
const dataTypeFileMap = {
  'users': ['ardor_active_users', 'ardor_users'],
  'trades': ['ardor_trades'],
  'burns': ['ardor_card_burns', 'ardor_burns'],
  'crafts': ['ardor_crafts', 'ardor_craftings'],
  'morphs': ['ardor_morphs', 'ardor_morphings'],
  'giftz_sales': ['ardor_giftz_sales']
};

/**
 * Migrate a specific data type from period-specific files to unified cache
 * @param {string} dataType - Type of data (users, trades, etc.)
 * @returns {Promise<Object>} Migration results
 */
async function migrateDataType(dataType) {
  try {
    console.log(`Migrating ${dataType} cache data to unified format...`);
    
    // List all cache files
    const allFiles = listAllCacheFiles();
    console.log(`Found ${allFiles.length} total cache files`);
    
    // Get the possible prefixes for this data type
    const possiblePrefixes = dataTypeFileMap[dataType] || [`ardor_${dataType}`];
    console.log(`Looking for files matching: ${possiblePrefixes.join(', ')}`);
    
    // Find all period-specific files for any of the possible prefixes
    const relevantFiles = [];
    possiblePrefixes.forEach(prefix => {
      allFiles.forEach(file => {
        if (file.filename.startsWith(prefix) && 
            file.isPeriodSpecific) {
          relevantFiles.push(file);
        }
      });
    });
    
    console.log(`Found ${relevantFiles.length} period-specific files for ${dataType}:`);
    relevantFiles.forEach(f => console.log(`- ${f.filename}`));
    
    if (relevantFiles.length === 0) {
      return { 
        success: false, 
        message: `No period-specific cache files found for ${dataType}` 
      };
    }
    
    // Find the "all" period cache first as it has the most complete data
    const allPeriodFile = relevantFiles.find(f => f.filename.includes('_all'));
    
    // Determine which file to use as the base
    const baseFile = allPeriodFile || relevantFiles[0];
    
    console.log(`Using ${baseFile.filename} as the base for unified cache`);
    
    // Read the base file data
    const baseFileName = baseFile.filename.replace('.json', '');
    const baseData = readJSON(baseFileName);
    
    if (!baseData) {
      return { 
        success: false, 
        message: `Failed to read base file data for ${dataType}` 
      };
    }
    
    // Determine the output file name (maintain the prefix from input)
    const outputPrefix = baseFileName.split('_').slice(0, -1).join('_');
    const unifiedCacheKey = outputPrefix;
    
    console.log(`Writing unified cache to ${unifiedCacheKey}.json`);
    
    // Update timestamp to current
    baseData.timestamp = new Date().toISOString();
    
    // Remove period marker if exists
    if (baseData.period) {
      baseData.period = 'all'; // Default to 'all'
    }
    
    // Write unified cache
    writeJSON(unifiedCacheKey, baseData);
    
    // Count records in the data (could be in different properties)
    let recordCount = 0;
    if (Array.isArray(baseData)) {
      recordCount = baseData.length;
    } else if (baseData.count !== undefined) {
      recordCount = baseData.count;
    } else {
      // Look for common array properties
      const arrayProps = Object.keys(baseData).filter(key => 
        Array.isArray(baseData[key]) && 
        ['users', 'ardor_users', 'trades', 'burns', 'craftings', 'crafts', 'morphs', 'morphings', 'sales', 'transfers'].includes(key)
      );
      
      if (arrayProps.length > 0) {
        recordCount = baseData[arrayProps[0]].length;
      }
    }
    
    return {
      success: true,
      message: `Successfully migrated ${dataType} to unified cache format`,
      source: baseFile.filename,
      destination: `${unifiedCacheKey}.json`,
      records: recordCount
    };
  } catch (error) {
    console.error(`Error migrating ${dataType} cache:`, error);
    return { 
      success: false, 
      message: `Error migrating ${dataType} cache: ${error.message}` 
    };
  }
}

/**
 * Run migration for all common data types
 * @returns {Promise<Object>} Migration results
 */
async function migrateAllCaches() {
  const dataTypes = [
    'users',
    'trades',
    'burns',
    'crafts',
    'morphs',
    'giftz_sales'
  ];
  
  const results = [];
  
  for (const dataType of dataTypes) {
    try {
      const result = await migrateDataType(dataType);
      results.push({
        dataType,
        ...result
      });
    } catch (error) {
      console.error(`Error in migration for ${dataType}:`, error);
      results.push({
        dataType,
        success: false,
        error: error.message
      });
    }
  }
  
  return {
    success: results.some(r => r.success),
    migrated: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
}

module.exports = {
  migrateDataType,
  migrateAllCaches
};
