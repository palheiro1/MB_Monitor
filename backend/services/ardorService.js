/**
 * Ardor Service
 * Central module for all Ardor blockchain interactions
 */

// Import various service modules
const { getTrackedAssets } = require('./ardor/assets');
const { getCardBurns } = require('./ardor/burns');
const { getTrades } = require('./ardor/trades');         // Confirm this is getTrades, not getArdorTrades
const { getCraftings } = require('./ardor/crafting');    // Fixed: was 'crafts', now 'crafting'
const { getMorphings } = require('./ardor/morphing');
const { getGiftzSales } = require('./ardor/giftz');
const { getActiveUsers } = require('./ardor/users');
const { CACHE_TTL } = require('../config'); // Add this import

// Use the same Ardor epoch constant for consistency
const ARDOR_EPOCH = 1514764800000; // January 1, 2018 00:00:00 UTC in milliseconds

/**
 * Convert Ardor timestamp to JavaScript Date
 * @param {number} timestamp - Ardor timestamp in seconds
 * @returns {Date} JavaScript Date object
 */
function ardorTimestampToDate(timestamp) {
  return new Date(ARDOR_EPOCH + (timestamp * 1000));
}

/**
 * Convert JavaScript Date to Ardor timestamp
 * @param {Date} date - JavaScript Date object
 * @returns {number} Ardor timestamp in seconds
 */
function dateToArdorTimestamp(date) {
  return Math.floor((date.getTime() - ARDOR_EPOCH) / 1000);
}

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
    const [trades, primarySales, craftings, morphings, cardBurns, gemBurns, activeUsers, trackedAssets, giftzSales] = 
      await Promise.all([
        getTrades(), 
        getPrimarySales(), 
        getCraftings(), 
        getMorphings(), 
        getCardBurns(), 
        getGEMBurns(),
        getActiveUsers(),
        getTrackedAssets(),
        getGiftzSales() // Add this
      ]);

    const allData = {
      trades: trades.count,
      primarySales: primarySales.count,
      craftings: craftings.count,
      morphings: morphings.count,
      cardBurns: cardBurns.count,
      gemBurns: gemBurns.count,
      activeUsers: activeUsers.activeUsers,
      giftzSales: giftzSales.count, // Add this
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
async function init() {
  console.log('Initializing Ardor service and populating caches...');
  
  try {
    // Initialize tracked assets cache
    await getTrackedAssets(true);
    
    // Initialize other data caches as needed
    // Only force refresh on startup for critical data
    await getTrades(false);
    await getCardBurns(false);
    await getCraftings(false);
    await getMorphings(false);
    
    console.log('Ardor service initialized');
  } catch (error) {
    console.error('Error initializing Ardor service:', error);
    throw error; // Re-throw to let the application handle it
  }
}

// Set up automatic cache refresh
setInterval(() => {
  console.log('Running scheduled cache refresh...');
  getTrackedAssets(true)
    .catch(err => console.error('Error refreshing assets cache:', err));
}, CACHE_TTL * 1000);

// When processing transaction data from Ardor API
function processTransactionData(transaction) {
  // Use correct timestamp conversion
  const timestamp = transaction.timestamp;
  const date = ardorTimestampToDate(timestamp);
  
  return {
    // ...existing properties...
    timestamp: timestamp,
    timestampISO: date.toISOString(),
    // ...other properties...
  };
}

// Export all service functions with consistent naming
module.exports = {
  init,
  getTrackedAssets,
  getCardBurns,
  getTrades,        // Not getArdorTrades
  getCraftings,     // Not getCrafts
  getMorphings,
  getGiftzSales,
  getActiveUsers
};
