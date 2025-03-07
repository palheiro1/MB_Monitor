/**
 * Polygon Blockchain Service
 * Handles data fetching and processing for Polygon blockchain
 */
const { getTrades } = require('./polygon/trades');
const { getActiveUsers } = require('./polygon/users');
const { getTrackedTokens } = require('./polygon/tokens');
const { readJSON, writeJSON } = require('../utils/jsonStorage');
const { MB_CONTRACT_ADDRESS, CACHE_TTL } = require('../config');

/**
 * Get all Polygon data combined
 * @returns {Promise<Object>} Combined Polygon data
 */
async function getAllData() {
  try {
    console.log('Fetching all Polygon data...');
    // Check JSON file first
    const cachedData = readJSON('polygon_all_data');
    if (cachedData) return cachedData;

    // Fetch all data in parallel
    const [trades, activeUsers, trackedTokens] = await Promise.all([
      getTrades(),
      getActiveUsers(),
      getTrackedTokens()
    ]);

    const allData = {
      trades: trades.count,
      activeUsers: activeUsers.activeUsers,
      trackedTokens: {
        tokenCount: trackedTokens.tokens ? trackedTokens.tokens.length : 0,
        contractAddress: MB_CONTRACT_ADDRESS,
        contractName: trackedTokens.contractInfo?.name || 'Mythical Beings'
      },
      timestamp: new Date().toISOString()
    };

    // Save to JSON file
    writeJSON('polygon_all_data', allData);
    console.log('Fetched all Polygon data:', allData);
    return allData;
  } catch (error) {
    console.error('Error fetching all Polygon data:', error.message);
    throw new Error(`Failed to fetch Polygon data: ${error.message}`);
  }
}

/**
 * Initialize service - start periodic cache updates
 */
function init() {
  // Update cache immediately
  getAllData().catch(err => console.error('Initial Polygon cache update failed:', err.message));

  // Set up periodic cache updates
  setInterval(() => {
    getAllData().catch(err => console.error('Periodic Polygon cache update failed:', err.message));
  }, CACHE_TTL * 1000);

  console.log('Polygon service initialized');
}

// Export only the functions we need
module.exports = {
  getTrades,
  getActiveUsers,
  getTrackedTokens,
  getAllData,
  init
};
