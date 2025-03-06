/**
 * Ardor Blockchain Service
 * Handles data fetching and processing for Ardor blockchain
 */
const axios = require('axios');
const { readJSON, writeJSON } = require('../utils/jsonStorage');

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

const { getTrades } = require('./ardor/trades');
const { getPrimarySales } = require('./ardor/sales');
const { getCraftings } = require('./ardor/crafting');
const { getMorphings } = require('./ardor/morphing');
const { getCardBurns } = require('./ardor/burns');
const { getActiveUsers } = require('./ardor/users');
const { getTrackedAssets } = require('./ardor/assets');

/**
 * Get all Ardor data combined
 * @returns {Promise<Object>} Combined Ardor data
 */
async function getAllData() {
  try {
    console.log('Fetching all Ardor data...');
    // Check JSON file first
    const cachedData = readJSON('ardor_all_data');
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

    // Save to JSON file
    writeJSON('ardor_all_data', allData);
    console.log('Fetched all Ardor data:', allData);
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
