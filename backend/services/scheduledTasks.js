/**
 * Scheduled Tasks Service
 * Handles periodic tasks like cache refreshing
 */
const ardorService = require('./ardorService');
const logger = require('../utils/logger');

// Schedule configuration
const CACHE_REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes

// Task tracking
let cacheRefreshTask = null;
let isRunning = false;

/**
 * Start the scheduled cache refresh task
 */
function startCacheRefreshTask() {
  if (cacheRefreshTask) {
    logger.info('Cache refresh task already running');
    return;
  }
  
  logger.info('Starting scheduled cache refresh task');
  
  // Run the task immediately once
  runCacheRefresh();
  
  // Then schedule it to run periodically
  cacheRefreshTask = setInterval(runCacheRefresh, CACHE_REFRESH_INTERVAL);
}

/**
 * Stop the scheduled cache refresh task
 */
function stopCacheRefreshTask() {
  if (cacheRefreshTask) {
    logger.info('Stopping scheduled cache refresh task');
    clearInterval(cacheRefreshTask);
    cacheRefreshTask = null;
  }
}

/**
 * Run the cache refresh operation
 * This checks for new data since the last update
 */
async function runCacheRefresh() {
  // Prevent concurrent execution
  if (isRunning) {
    logger.debug('Cache refresh already in progress, skipping this run');
    return;
  }
  
  isRunning = true;
  logger.info('Running scheduled cache refresh');
  
  try {
    // Try to refresh trades first
    await ardorService.getTrades('all', false);
    
    // Then refresh crafts
    await ardorService.getCraftings(false, 'all');
    
    // Then refresh morphs
    await ardorService.getMorphings(false, 'all');
    
    // Refresh burns
    await ardorService.getCardBurns(false, 'all');
    
    // Refresh Giftz sales
    await ardorService.getGiftzSales(false, 'all');
    
    logger.info('Scheduled cache refresh completed successfully');
  } catch (error) {
    logger.error('Error during scheduled cache refresh:', error);
  } finally {
    isRunning = false;
  }
}

module.exports = {
  startCacheRefreshTask,
  stopCacheRefreshTask,
  runCacheRefresh
};
