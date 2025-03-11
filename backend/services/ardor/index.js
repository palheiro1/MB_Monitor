const { getTrades } = require('./trades');
const { getPrimarySales } = require('./sales');
const { getCraftings } = require('./crafting');
const { getMorphings } = require('./morphing');
const { getCardBurns } = require('./burns');
const { getActiveUsers } = require('./users');
const { getTrackedAssets } = require('./assets');
const { ARDOR_API_URL } = require('../../config');
const { logApiNodeInfo } = require('../../utils/apiUtils');

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

async function initializeArdorService() {
  console.log('Initializing Ardor service and populating caches...');
  
  // Log information about which API node we're using
  logApiNodeInfo(ARDOR_API_URL);
  
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
  init: initializeArdorService
};