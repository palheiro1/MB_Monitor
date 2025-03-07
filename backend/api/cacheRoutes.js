const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Storage directory
const STORAGE_DIR = path.join(__dirname, '../storage');

/**
 * Get cache status
 */
router.get('/status', (req, res) => {
  try {
    // Ensure storage directory exists
    if (!fs.existsSync(STORAGE_DIR)) {
      return res.json({
        status: 'error',
        message: 'Storage directory does not exist',
        directory: STORAGE_DIR
      });
    }
    
    // Get all JSON files in storage directory
    const files = fs.readdirSync(STORAGE_DIR)
      .filter(filename => filename.endsWith('.json'))
      .map(filename => {
        const filePath = path.join(STORAGE_DIR, filename);
        const stats = fs.statSync(filePath);
        let data = { count: 0, timestamp: null, records: [], dateRange: null };
        
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const parsed = JSON.parse(fileContent);
          
          // Extract count and timestamp from different cache formats
          if (parsed.count !== undefined) {
            data.count = parsed.count;
          } else if (parsed.burns && Array.isArray(parsed.burns)) {
            data.count = parsed.burns.length;
            data.records = parsed.burns;
          } else if (parsed.transfers && Array.isArray(parsed.transfers)) {
            data.count = parsed.transfers.length;
            data.records = parsed.transfers;
          } else if (parsed.craftings && Array.isArray(parsed.craftings)) {
            data.count = parsed.craftings.length;
            data.records = parsed.craftings;
          } else if (Array.isArray(parsed)) {
            data.count = parsed.length;
            data.records = parsed;
          }
          
          // Extract date range if possible
          if (data.records && data.records.length > 0) {
            const dates = data.records
              .filter(record => record.date || record.timestamp || record.burnDate)
              .map(record => new Date(record.date || record.burnDate || 
                (typeof record.timestamp === 'string' ? record.timestamp : 
                 (record.timestamp * 1000))).getTime());
            
            if (dates.length > 0) {
              data.dateRange = {
                start: new Date(Math.min(...dates)).toISOString(),
                end: new Date(Math.max(...dates)).toISOString()
              };
            }
          }
          
          data.timestamp = parsed.timestamp || null;
          
          // Add file-specific data for commonly used caches
          if (filename === 'ardor_card_burns.json' && parsed.burns) {
            data.burns = parsed.burns;
          } else if (filename === 'ardor_gem_burns.json' && parsed.transfers) {
            data.gemBurns = parsed.transfers;
          }
          
        } catch (e) {
          console.error(`Error parsing ${filename}:`, e.message);
        }
        
        return {
          filename: filename,
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime,
          records: data.count,
          timestamp: data.timestamp,
          dateRange: data.dateRange,
          // Include the actual data for common caches to make debugging easier
          data: filename.includes('burns.json') || filename.includes('craftings.json') ? data : undefined
        };
      });
    
    // Create a combined response with high-level stats and details
    const result = {
      status: 'success',
      cacheDirectory: STORAGE_DIR,
      files: files,
      totalFiles: files.length,
      summary: {
        cardBurns: files.find(f => f.filename === 'ardor_card_burns.json')?.records || 0,
        gemBurns: files.find(f => f.filename === 'ardor_gem_burns.json')?.records || 0,
        craftings: files.find(f => f.filename === 'ardor_craftings.json')?.records || 0
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error getting cache status:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

/**
 * Get specific cache file content
 */
router.get('/file/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    // Make sure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid filename'
      });
    }
    
    const filePath = path.join(STORAGE_DIR, `${filename}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        status: 'error',
        message: `Cache file ${filename}.json not found`
      });
    }
    
    // Read and parse the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    res.json({
      status: 'success',
      filename: `${filename}.json`,
      data: data
    });
  } catch (error) {
    console.error('Error reading cache file:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

/**
 * Clear specific cache file
 */
router.delete('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(STORAGE_DIR, `${filename}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        status: 'error',
        message: `Cache file ${filename}.json not found`
      });
    }
    
    fs.unlinkSync(filePath);
    
    res.json({
      status: 'success',
      message: `Cache file ${filename}.json deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting cache file:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

/**
 * Clear all cache files
 */
router.delete('/', (req, res) => {
  try {
    // Ensure storage directory exists
    if (!fs.existsSync(STORAGE_DIR)) {
      return res.json({
        status: 'success',
        message: 'No cache files to delete'
      });
    }
    
    // Get all JSON files in storage directory
    const files = fs.readdirSync(STORAGE_DIR)
      .filter(filename => filename.endsWith('.json'));
      
    // Delete each file
    const deleted = files.map(filename => {
      const filePath = path.join(STORAGE_DIR, filename);
      fs.unlinkSync(filePath);
      return filename;
    });
    
    res.json({
      status: 'success',
      deletedFiles: deleted,
      count: deleted.length
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

module.exports = router;
