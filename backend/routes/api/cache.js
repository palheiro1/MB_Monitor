/**
 * Cache API Routes
 * 
 * Provides endpoints for cache management and stats
 */
const express = require('express');
const router = express.Router();
const cacheService = require('../../services/cacheService');
const { createCacheKey } = require('../../utils/cacheUtils');

/**
 * GET /api/cache/status - Get cache status
 */
router.get('/status', (req, res) => {
  try {
    const stats = cacheService.getCacheMetrics();
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      files: stats.fileCache.files,
      count: stats.fileCache.files.length,
      memoryStats: stats.memoryCaches
    });
  } catch (error) {
    console.error('Error getting cache status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get cache status',
      error: error.message
    });
  }
});

/**
 * GET /api/cache/file/:filename - Get specific cache file
 */
router.get('/file/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    // Make sure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid filename'
      });
    }
    
    const data = cacheService.file.read(filename);
    
    if (!data) {
      return res.status(404).json({
        status: 'error',
        message: `Cache file ${filename} not found`
      });
    }
    
    res.json({
      status: 'success',
      filename: `${filename}.json`,
      data
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
 * DELETE /api/cache/file/:filename - Clear specific cache
 */
router.delete('/file/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const result = cacheService.file.delete(filename);
    
    if (result) {
      res.json({
        status: 'success',
        message: `Cache file ${filename} deleted successfully`
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: `Cache file ${filename} not found`
      });
    }
  } catch (error) {
    console.error('Error deleting cache file:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/cache/all - Clear all caches
 */
router.delete('/all', (req, res) => {
  try {
    const fileResult = cacheService.file.clearAll();
    const memoryCleared = cacheService.memory.clear();
    const txCleared = cacheService.transaction.clear();
    const requestCleared = cacheService.request.clear();
    
    res.json({
      status: 'success',
      message: 'All caches cleared successfully',
      details: {
        fileCache: fileResult,
        memoryCaches: {
          memory: memoryCleared,
          transaction: txCleared,
          request: requestCleared
        }
      }
    });
  } catch (error) {
    console.error('Error clearing caches:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

/**
 * GET /api/cache/debug - Debug endpoint
 */
router.get('/debug', (req, res) => {
  try {
    // Add some interesting debug information
    const metrics = cacheService.getCacheMetrics();
    const hitRatios = {
      memory: metrics.memoryCaches.memory.hitRatio,
      transaction: metrics.memoryCaches.transaction.hitRatio,
      request: metrics.memoryCaches.request.hitRatio
    };
    
    res.json({
      status: 'success',
      message: 'Cache system is functioning properly',
      timestamp: new Date().toISOString(),
      metrics: {
        fileCacheCount: metrics.fileCache.count,
        fileCacheTotalSize: metrics.fileCache.totalSize,
        memoryCacheItems: metrics.memoryCaches.memory.size,
        transactionCacheItems: metrics.memoryCaches.transaction.size,
        requestCacheItems: metrics.memoryCaches.request.size,
        hitRatios
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;
