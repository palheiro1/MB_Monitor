/**
 * Cache Cleanup Script
 * Resolves cases where both unified and period-specific cache files exist
 */
const fs = require('fs');
const path = require('path');
const { readJSON, writeJSON } = require('../utils/jsonStorage');

// Storage directory
const STORAGE_DIR = path.join(__dirname, '../storage');

/**
 * Get all cache files and group them by base name
 */
function getGroupedCacheFiles() {
  // Read all JSON files in the directory
  const files = fs.readdirSync(STORAGE_DIR)
    .filter(filename => filename.endsWith('.json'));
  
  // Group files by base name
  const groupedFiles = {};
  
  files.forEach(filename => {
    // Extract base name and period (if any)
    let baseName, period;
    
    if (filename.includes('_24h.') || filename.includes('_7d.') || 
        filename.includes('_30d.') || filename.includes('_all.')) {
      // Has period suffix
      const parts = filename.split('_');
      period = parts.pop().replace('.json', '');
      baseName = parts.join('_');
    } else {
      // No period suffix
      baseName = filename.replace('.json', '');
      period = null;
    }
    
    if (!groupedFiles[baseName]) {
      groupedFiles[baseName] = [];
    }
    
    groupedFiles[baseName].push({
      filename,
      period,
      path: path.join(STORAGE_DIR, filename),
      size: fs.statSync(path.join(STORAGE_DIR, filename)).size
    });
  });
  
  return groupedFiles;
}

/**
 * Cleanup a specific data type that has both unified and period files
 */
async function cleanupDataType(baseName, files) {
  console.log(`\nCleaning up ${baseName}...`);
  
  // Find the unified file and the most comprehensive period file (usually _all)
  const unifiedFile = files.find(file => file.period === null);
  const allPeriodFile = files.find(file => file.period === 'all');
  
  if (!unifiedFile || !allPeriodFile) {
    console.log(`  ⚠️ Skipping ${baseName}: Missing unified or all-period file`);
    return {
      success: false,
      message: 'Missing required files'
    };
  }
  
  // Read both files
  const unifiedData = readJSON(baseName);
  const allPeriodData = readJSON(`${baseName}_all`);
  
  // Skip if either read fails
  if (!unifiedData || !allPeriodData) {
    console.log(`  ⚠️ Skipping ${baseName}: Failed to read one or both files`);
    return {
      success: false,
      message: 'Failed to read files'
    };
  }
  
  // Check which file has more records
  const unifiedCount = getRecordCount(unifiedData);
  const allPeriodCount = getRecordCount(allPeriodData);
  
  console.log(`  - Unified file: ${unifiedCount} records (${formatBytes(unifiedFile.size)})`);
  console.log(`  - All period file: ${allPeriodCount} records (${formatBytes(allPeriodFile.size)})`);
  
  // Decide which file to keep
  const keepUnified = unifiedCount >= allPeriodCount;
  
  if (keepUnified) {
    console.log('  - Keeping unified file (it has more or equal records)');
  } else {
    console.log('  - Updating unified file with all-period data');
    // Update timestamp to current
    allPeriodData.timestamp = new Date().toISOString();
    if (allPeriodData.period) delete allPeriodData.period;
    
    // Write updated data to unified file
    writeJSON(baseName, allPeriodData);
    console.log(`  - Wrote ${allPeriodCount} records to ${baseName}.json`);
  }
  
  // Delete all period-specific files
  const deletedFiles = [];
  for (const file of files) {
    if (file.period !== null) {
      fs.unlinkSync(file.path);
      deletedFiles.push(file.filename);
    }
  }
  
  console.log(`  ✅ Deleted ${deletedFiles.length} period-specific files`);
  return {
    success: true,
    message: keepUnified ? 'Kept unified file' : 'Updated unified file',
    deletedFiles
  };
}

/**
 * Get record count from a cache data object
 */
function getRecordCount(data) {
  if (!data) return 0;
  
  if (Array.isArray(data)) {
    return data.length;
  }
  
  if (data.count !== undefined) {
    return data.count;
  }
  
  // Look for common array properties
  const commonArrayProps = ['users', 'ardor_users', 'trades', 'burns', 'craftings', 
                           'crafts', 'morphs', 'morphings', 'sales', 'transfers'];
  
  for (const prop of commonArrayProps) {
    if (Array.isArray(data[prop])) {
      return data[prop].length;
    }
  }
  
  return 0;
}

/**
 * Format file size in human-readable format
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Main function to run cleanup
 */
async function runCleanup() {
  console.log('Starting cache cleanup...');
  
  try {
    // Get grouped files
    const groupedFiles = getGroupedCacheFiles();
    
    // Find data types that have both unified and period files
    const dataTypesToClean = [];
    
    for (const [baseName, files] of Object.entries(groupedFiles)) {
      const hasPeriodFiles = files.some(file => file.period !== null);
      const hasUnifiedFile = files.some(file => file.period === null);
      
      if (hasPeriodFiles && hasUnifiedFile) {
        dataTypesToClean.push(baseName);
      }
    }
    
    if (dataTypesToClean.length === 0) {
      console.log('No data types need cleanup. All files are already in the correct format.');
      return;
    }
    
    console.log(`Found ${dataTypesToClean.length} data types needing cleanup: ${dataTypesToClean.join(', ')}`);
    
    // Process each data type
    const results = [];
    
    for (const baseName of dataTypesToClean) {
      try {
        const result = await cleanupDataType(baseName, groupedFiles[baseName]);
        results.push({
          dataType: baseName,
          ...result
        });
      } catch (error) {
        console.error(`Error cleaning up ${baseName}:`, error);
        results.push({
          dataType: baseName,
          success: false,
          error: error.message
        });
      }
    }
    
    // Print summary
    console.log('\nCleanup Summary:');
    console.log(`- Successfully cleaned: ${results.filter(r => r.success).length} data types`);
    console.log(`- Failed: ${results.filter(r => !r.success).length} data types`);
    
    console.log('\nCache system is now cleaned up! All data types use a single source of truth.');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Run cleanup
runCleanup();
