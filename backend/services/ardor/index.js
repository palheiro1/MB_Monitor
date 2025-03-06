const { getTrades } = require('./trades');
const { getPrimarySales } = require('./sales');
const { getCraftings } = require('./crafting');
const { getMorphings } = require('./morphing');
const { getCardBurns } = require('./burns');
const { getActiveUsers } = require('./users');
const { getTrackedAssets } = require('./assets');

async function getAllData() {
  try {
    console.log('Fetching all Ardor data...');
    // Check cache first
    const cachedData = cache.get('ardor_all_data');
    if (cachedData) return cachedData;
    // Fetch all data in parallel
    const [trades, primarySales, craftings, morphings, cardBurns, activeUsers, trackedAssets] = 
      await Promise.all([
        getTrades(), 
        getPrimarySales(), 
        getCraftings(), 
        getMorphings(), 
        getCardBurns(), 
        getActiveUsers(),
        getTrackedAssets()
      ]);
    const allData = {
      trades: trades.count,
      primarySales: primarySales.count,
      craftings: craftings.count,
      morphings: morphings.count,
      cardBurns: cardBurns.count,
      activeUsers: activeUsers.activeUsers,
      trackedAssets: {
        regularCardsCount: trackedAssets.regularCards.length,
        specialCardsCount: trackedAssets.specialCards.length,
        specificTokensCount: trackedAssets.specificTokens.length
      },
      timestamp: new Date().toISOString()
    };
    // Update cache
    cache.set('ardor_all_data', allData, CACHE_TTL);
    console.log('Fetched all Ardor data:', allData);
    return allData;
  } catch (error) {
    console.error('Error fetching all Ardor data:', error.message);
    throw new Error(`Failed to fetch Ardor data: ${error.message}`);
  }
}

function init() {
  // Update cache immediately
  getAllData().catch(err => console.error('Initial Ardor cache update failed:', err.message));
  // Set up periodic cache updates
  setInterval(() => {
    getAllData().catch(err => console.error('Periodic Ardor cache update failed:', err.message));
  }, CACHE_TTL * 1000);
  console.log('Ardor service initialized');
}

module.exports = {
  getTrades,
  getPrimarySales,
  getCraftings,
  getMorphings,
  getCardBurns,
  getActiveUsers,
  getTrackedAssets,
  getAllData,
  init
};