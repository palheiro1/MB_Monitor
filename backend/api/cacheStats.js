/**
 * Cache Statistics API
 * 
 * Provides endpoints to monitor cache performance and clear caches when needed
 */
const express = require('express');
const router = express.Router();
const { getCacheStats, clearRequestCache } = require('../utils/apiUtils');
const transactionCache = require('../cache/transactionCache');

/**
 * GET /api/cache/stats
 * Get detailed statistics about all application caches
 */
router.get('/stats', (req, res) => {
  try {
    const requestCacheStats = getCacheStats();
    const txCacheStats = transactionCache.stats();
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      caches: {
        apiRequests: {
          size: requestCacheStats.total,
          valid: requestCacheStats.valid,
          expired: requestCacheStats.expired
        },
        transactions: {
          size: txCacheStats.size,
          valid: txCacheStats.valid,
          expired: txCacheStats.expired
        }
      }
    });
  } catch (error) {
    console.error('Error getting cache statistics:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * POST /api/cache/clear
 * Clear specific or all caches
 */
router.post('/clear', (req, res) => {
  try {
    const { type } = req.body;
    
    if (type === 'requests' || type === 'all') {
      clearRequestCache();
    }
    
    if (type === 'transactions' || type === 'all') {
      transactionCache.clear();
    }
    
    res.json({
      status: 'success',
      message: `Cache${type ? ' ' + type : ''} cleared successfully`,
      timestamp: new Date().toISOString()
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
