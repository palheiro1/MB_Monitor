const { getTrades } = require('./trades');
const { getTrackedTokens } = require('./tokens');
const { getActiveUsers } = require('./users');

async function getAllData() {
  try {
    console.log('Fetching all Polygon data...');
    // Check cache first
    const cachedData = cache.get('polygon_all_data');
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
        tokenCount: trackedTokens.tokens.length,
        contractAddress: MB_CONTRACT_ADDRESS,
        contractName: trackedTokens.contractInfo?.name || 'Mythical Beings'
      },
      timestamp: new Date().toISOString()
    };
    // Update cache
    cache.set('polygon_all_data', allData, CACHE_TTL);
    console.log('Fetched all Polygon data:', allData);
    return allData;
  } catch (error) {
    console.error('Error fetching all Polygon data:', error.message);
    throw new Error(`Failed to fetch Polygon data: ${error.message}`);
  }
}

function init() {
  // Update cache immediately
  getAllData().catch(err => console.error('Initial Polygon cache update failed:', err.message));
  // Set up periodic cache updates
  setInterval(() => {
    getAllData().catch(err => console.error('Periodic Polygon cache update failed:', err.message));
  }, CACHE_TTL * 1000);
  console.log('Polygon service initialized');
}

module.exports = {
  getTrades,
  getTrackedTokens,
  getActiveUsers,
  getAllData,
  init
};