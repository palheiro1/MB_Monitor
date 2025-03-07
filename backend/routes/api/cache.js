const express = require('express');
const router = express.Router();
const { readJSON } = require('../../utils/jsonStorage');
const { listCacheFiles, clearCacheFile, clearAllCaches } = require('../../utils/cacheManager');

// Get cache status and file info
router.get('/status', async (req, res) => {
  try {
    const cacheFiles = await listCacheFiles();
    
    res.json({
      status: 'success',
      files: cacheFiles,
      count: cacheFiles.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting cache status:', error);
    res.status(500).json({ error: 'Failed to get cache status' });
  }
});

// Get a specific cache file
router.get('/file/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const data = readJSON(filename);
    
    if (!data) {
      return res.status(404).json({ 
        status: 'error',
        message: `Cache file ${filename} not found`
      });
    }
    
    res.json({
      status: 'success',
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error reading cache file ${req.params.filename}:`, error);
    res.status(500).json({ 
      status: 'error',
      message: `Failed to read cache file: ${error.message}`
    });
  }
});

// Clear a specific cache file
router.delete('/file/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const result = await clearCacheFile(filename);
    
    if (result.success) {
      res.json({
        status: 'success',
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: result.message
      });
    }
  } catch (error) {
    console.error(`Error clearing cache file ${req.params.filename}:`, error);
    res.status(500).json({ 
      status: 'error',
      message: `Failed to clear cache file: ${error.message}`
    });
  }
});

// Clear all cache files
router.delete('/all', async (req, res) => {
  try {
    const result = await clearAllCaches();
    
    if (result.success) {
      res.json({
        status: 'success',
        message: result.message,
        details: result.details,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: result.message,
        details: result.details
      });
    }
  } catch (error) {
    console.error('Error clearing all caches:', error);
    res.status(500).json({ 
      status: 'error',
      message: `Failed to clear all caches: ${error.message}`
    });
  }
});

module.exports = router;
