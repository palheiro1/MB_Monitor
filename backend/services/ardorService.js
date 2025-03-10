/**
 * Ardor Blockchain Service
 * Handles data fetching and processing for Ardor blockchain
 */
const { readJSON, writeJSON } = require('../utils/jsonStorage');
const { CACHE_TTL } = require('../config');

const { getTrades } = require('./ardor/trades');
const { getPrimarySales } = require('./ardor/sales');
const { getCraftings } = require('../services/ardor/crafting');
const { getMorphings } = require('./ardor/morphing');
const { getCardBurns, getGEMBurns } = require('./ardor/burns'); // Update to import getGEMBurns
const { getActiveUsers } = require('./ardor/users');
const { getTrackedAssets } = require('./ardor/assets');

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
    const [trades, primarySales, craftings, morphings, cardBurns, gemBurns, activeUsers, trackedAssets] = 
      await Promise.all([
        getTrades(), 
        getPrimarySales(), 
        getCraftings(), 
        getMorphings(), 
        getCardBurns(), 
        getGEMBurns(),
        getActiveUsers(),
        getTrackedAssets()
      ]);

    const allData = {
      trades: trades.count,
      primarySales: primarySales.count,
      craftings: craftings.count,
      morphings: morphings.count,
      cardBurns: cardBurns.count,
      gemBurns: gemBurns.count,
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
  console.log('Initializing Ardor service and populating caches...');
  
  // Fetch the master trades cache with all trades first
  getTrades('all', true)
    .then(result => console.log(`Initialized main trades cache with ${result.count} trades`))
    .catch(err => console.error('Failed to initialize trades cache:', err.message));
    
  // Then fetch other data
  getAllData().catch(err => console.error('Initial Ardor cache update failed:', err.message));

  // Set up periodic cache updates
  setInterval(() => {
    getAllData().catch(err => console.error('Periodic Ardor cache update failed:', err.message));
    // Refresh the master trades cache periodically (but less frequently)
    if (Math.random() < 0.2) { // ~20% chance of refreshing trades on each cycle
      getTrades('all', true)
        .catch(err => console.error('Periodic trades cache update failed:', err.message));
    }
  }, CACHE_TTL * 1000);

  console.log('Ardor service initialized');
}

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

module.exports = {
  getTrades,
  getPrimarySales,
  getCraftings,
  getMorphings,
  getCardBurns,
  getGEMBurns, // Add getGEMBurns to exports
  getActiveUsers,
  getTrackedAssets,
  getAllData,
  init
};
