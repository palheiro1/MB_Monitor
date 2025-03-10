/**
 * Ardor Morphing Service
 * 
 * Handles detection and processing of card morphing operations
 */
const axios = require('axios');
const { getCachedData } = require('../../utils/cacheManager');
const { ARDOR_API_URL, ARDOR_CHAIN_ID } = require('../../config');

// Constants
const MORPHING_MESSAGE = "cardmorph";
const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();

/**
 * Generate a time-based period filter
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @returns {number} Cutoff timestamp for filter
 */
function getPeriodFilter(period) {
  // Ardor epoch start
  const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();
  const now = new Date().getTime();
  const currentTimestampArdor = Math.floor((now - ARDOR_EPOCH) / 1000);
  
  switch (period) {
    case '24h':
      return currentTimestampArdor - 86400; // 24 hours
    case '7d':
      return currentTimestampArdor - 604800; // 7 days
    case '30d':
      return currentTimestampArdor - 2592000; // 30 days
    case 'all':
    default:
      return 0; // All time
  }
}

/**
 * Get all morphing operations
 * @param {boolean} forceRefresh - Whether to force refresh cache
 * @param {string} period - Time period to filter (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Morphing data
 */
async function getMorphings(forceRefresh = false, period = 'all') {
  try {
    // Use the unified caching approach with period filtering
    return await getCachedData(
      'morphings',   // data type
      period,        // period for filtering
      fetchMorphingsData, // function to fetch fresh data
      forceRefresh,  // whether to force refresh
      {
        // Additional options for filtering
        timestampField: 'timestamp',
        dateField: 'timestampISO',
        dataArrayField: 'morphs'
      }
    );
  } catch (error) {
    console.error('Error fetching morphings:', error.message);
    throw new Error(`Failed to fetch morphings: ${error.message}`);
  }
}

/**
 * Fetch all morphing data (separated for clarity)
 * @returns {Promise<Object>} All morphing data
 */
async function fetchMorphingsData() {
  console.log('Fetching fresh morphing data...');
  
  // Fetch and process morphing operations
  // Implementation depends on your specific logic for detecting morphs
  
  // This is a placeholder for the actual implementation
  const morphs = [];
  
  // Sort by timestamp (newest first)
  morphs.sort((a, b) => b.timestamp - a.timestamp);
  
  // Create result object
  const result = {
    morphs,
    count: morphs.length,
    timestamp: new Date().toISOString()
  };
  
  console.log(`Found ${morphs.length} valid morphing operations`);
  
  return result;
}

module.exports = { getMorphings };