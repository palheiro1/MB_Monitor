/**
 * Cache Manager Utility
 * 
 * Provides functions for managing cache files, including clearing and refreshing.
 */
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

// Path to storage directory
const STORAGE_DIR = path.join(__dirname, '../storage');

/**
 * List all cache files
 * @returns {Promise<Array>} List of cache files with stats
 */
async function listCacheFiles() {
  try {
    const files = await readdirAsync(STORAGE_DIR);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const fileStats = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(STORAGE_DIR, file);
        const stats = await statAsync(filePath);
        
        // Read file to get count if possible
        let count = 0;
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          count = data.count || (Array.isArray(data) ? data.length : 0);
        } catch (e) {
          // Ignore errors reading file content
        }
        
        return {
          name: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime,
          count
        };
      })
    );
    
    return fileStats;
  } catch (error) {
    console.error('Error listing cache files:', error);
    return [];
  }
}

/**
 * Clear a specific cache file
 * @param {string} filename - Name of the cache file
 * @returns {Promise<Object>} Result of the operation
 */
async function clearCacheFile(filename) {
  try {
    const filePath = path.join(STORAGE_DIR, `${filename}.json`);
    
    if (fs.existsSync(filePath)) {
      await unlinkAsync(filePath);
      return { 
        success: true, 
        message: `Cache file ${filename}.json cleared successfully`
      };
    } else {
      return { 
        success: false, 
        message: `Cache file ${filename}.json does not exist`
      };
    }
  } catch (error) {
    console.error(`Error clearing cache file ${filename}:`, error);
    return { 
      success: false, 
      message: `Error clearing cache file: ${error.message}`
    };
  }
}

/**
 * Clear all cache files
 * @returns {Promise<Object>} Result of the operation
 */
async function clearAllCaches() {
  try {
    const files = await readdirAsync(STORAGE_DIR);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const results = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(STORAGE_DIR, file);
        try {
          await unlinkAsync(filePath);
          return { file, success: true };
        } catch (error) {
          return { file, success: false, error: error.message };
        }
      })
    );
    
    const clearedCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    return {
      success: failedCount === 0,
      message: `Cleared ${clearedCount} cache files. ${failedCount ? `Failed to clear ${failedCount} files.` : ''}`,
      details: results
    };
  } catch (error) {
    console.error('Error clearing all caches:', error);
    return { 
      success: false, 
      message: `Error clearing caches: ${error.message}`
    };
  }
}

module.exports = {
  listCacheFiles,
  clearCacheFile,
  clearAllCaches
};
