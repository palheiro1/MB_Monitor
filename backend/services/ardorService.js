/**
 * Ardor Blockchain Service
 * Handles data fetching and processing for Ardor blockchain
 */
const axios = require('axios');
const cache = require('../cache');

// Configuration - in a real app, consider moving to environment variables
const ARDOR_API_URL = 'https://ardor.jelurida.com/nxt';
const CACHE_TTL = 300; // 5 minutes in seconds

// Regular Cards issuer
const REGULAR_CARDS_ISSUER = 'ARDOR-4V3B-TVQA-Q6LF-GMH3T';
// Special Cards issuer
const SPECIAL_CARDS_ISSUER = 'ARDOR-5NCL-DRBZ-XBWF-DDN5T';
// Specific token IDs to track
const TOKEN_IDS = [
  '935701767940516955',
  '2188455459770682500', 
  '13993107092599641878',
  '10230963490193589789'
];

/**
 * Fetch trades data from Ardor blockchain
 * @returns {Promise<Object>} Trades data
 */
async function getTrades() {
  try {
    // Corrected endpoint for fetching trades
    const response = await axios.get(`${ARDOR_API_URL}?requestType=getAssetTransfers&chain=2&lastIndex=10`);
    return {
      trades: response.data.transfers || [],
      count: response.data.transfers ? response.data.transfers.length : 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching Ardor trades:', error.message);
    throw new Error(`Failed to fetch Ardor trades: ${error.message}`);
  }
}

/**
 * Fetch primary GIFTZ sales data
 * @returns {Promise<Object>} Sales data
 */
async function getPrimarySales() {
  try {
    // Ensure the parameters for getBlockchainTransactions are accurate
    const response = await axios.get(`${ARDOR_API_URL}?requestType=getBlockchainTransactions&chain=2&type=2&subtype=3&firstIndex=0&lastIndex=100`);
    return {
      sales: response.data.transactions || [],
      count: response.data.transactions ? response.data.transactions.length : 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching Ardor primary sales:', error.message);
    throw new Error(`Failed to fetch Ardor primary sales: ${error.message}`);
  }
}

/**
 * Fetch crafting data
 * @returns {Promise<Object>} Crafting data
 */
async function getCraftings() {
  try {
    // Mock implementation - replace with actual API call
    return {
      craftings: [],
      count: 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching Ardor craftings:', error.message);
    throw new Error(`Failed to fetch Ardor craftings: ${error.message}`);
  }
}

/**
 * Fetch morphing data
 * @returns {Promise<Object>} Morphing data
 */
async function getMorphings() {
  try {
    // Mock implementation - replace with actual API call
    return {
      morphings: [],
      count: 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching Ardor morphings:', error.message);
    throw new Error(`Failed to fetch Ardor morphings: ${error.message}`);
  }
}

/**
 * Fetch card burn data
 * @returns {Promise<Object>} Card burn data
 */
async function getCardBurns() {
  try {
    // Mock implementation - replace with actual API call
    return {
      burns: [],
      count: 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching Ardor card burns:', error.message);
    throw new Error(`Failed to fetch Ardor card burns: ${error.message}`);
  }
}

/**
 * Fetch active users data
 * @returns {Promise<Object>} Active users data
 */
async function getActiveUsers() {
  try {
    // Mock implementation - replace with actual API call
    return {
      activeUsers: 125, // Mock data
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching Ardor active users:', error.message);
    throw new Error(`Failed to fetch Ardor active users: ${error.message}`);
  }
}

/**
 * Fetch assets from specific issuers and with specific IDs
 * @returns {Promise<Object>} Assets data
 */
async function getTrackedAssets() {
  try {
    // Check cache first
    const cacheKey = 'ardor_tracked_assets';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) return cachedData;

    // Initialize the result structure
    const result = {
      regularCards: [],
      specialCards: [],
      specificTokens: [],
      timestamp: new Date().toISOString()
    };

    // Get Regular Cards (assets issued by REGULAR_CARDS_ISSUER)
    try {
      const regularCardsResponse = await axios.get(`${ARDOR_API_URL}?requestType=getAssetsByIssuer&account=${REGULAR_CARDS_ISSUER}&includeCounts=true&firstIndex=0&lastIndex=100`);
      if (regularCardsResponse.data && regularCardsResponse.data.assets) {
        result.regularCards = regularCardsResponse.data.assets;
      }
    } catch (error) {
      console.error('Error fetching regular cards:', error.message);
    }

    // Get Special Cards (assets issued by SPECIAL_CARDS_ISSUER)
    try {
      const specialCardsResponse = await axios.get(`${ARDOR_API_URL}?requestType=getAssetsByIssuer&account=${SPECIAL_CARDS_ISSUER}&includeCounts=true&firstIndex=0&lastIndex=100`);
      if (specialCardsResponse.data && specialCardsResponse.data.assets) {
        result.specialCards = specialCardsResponse.data.assets;
      }
    } catch (error) {
      console.error('Error fetching special cards:', error.message);
    }

    // Get Specific Token IDs
    const tokenPromises = TOKEN_IDS.map(assetId => 
      axios.get(`${ARDOR_API_URL}?requestType=getAsset&asset=${assetId}&includeCounts=true`)
        .then(response => response.data)
        .catch(err => {
          console.error(`Error fetching token ${assetId}:`, err.message);
          return null;
        })
    );

    const tokenResults = await Promise.all(tokenPromises);
    result.specificTokens = tokenResults.filter(token => token !== null);

    // Cache the result
    cache.set(cacheKey, result, CACHE_TTL);
    
    return result;
  } catch (error) {
    console.error('Error fetching tracked Ardor assets:', error.message);
    throw new Error(`Failed to fetch tracked Ardor assets: ${error.message}`);
  }
}

/**
 * Get all Ardor data combined
 * @returns {Promise<Object>} Combined Ardor data
 */
async function getAllData() {
  try {
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
    return allData;
  } catch (error) {
    console.error('Error fetching all Ardor data:', error.message);
    throw new Error(`Failed to fetch Ardor data: ${error.message}`);
  }
}

/**
 * Initialize service - start periodic cache updates
 */
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
