const axios = require('axios');
const { readJSON, writeJSON } = require('../../utils/jsonStorage');
const { fetchMorphTransactions, processMorphData } = require('./morphingUtils');
const { ARDOR_API_URL } = require('../../config');
const { getTrackedAssets } = require('./assets');

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
 * Get morphing operations with optional caching
 * @param {boolean} forceRefresh - Whether to force refresh the cache
 * @param {string} period - Time period to filter (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Morphing data
 */
async function getMorphings(forceRefresh = false, period = 'all') {
  try {
    // Check cache first
    const cacheKey = `ardor_morphings_${period}`;
    const cachedData = readJSON(cacheKey);
    if (cachedData && !forceRefresh) {
      console.log(`Using cached morphings for period ${period} with ${cachedData.count || 0} entries`);
      return {
        morphs: cachedData.morphings || [], // Add compatibility with frontend expectations
        morphings: cachedData.morphings || [],
        count: cachedData.count || 0,
        timestamp: cachedData.timestamp,
        period
      };
    }
    
    console.log(`Fetching morphing data for period ${period}...`);
    
    // Get all regular cards to check for morphs
    const trackedAssets = await getTrackedAssets();
    
    // Extract asset IDs for regular cards
    let regularCardAssetIds = [];
    if (trackedAssets.regularCards && Array.isArray(trackedAssets.regularCards)) {
      regularCardAssetIds = Array.isArray(trackedAssets.regularCards[0])
        ? trackedAssets.regularCards[0].map(card => card.asset)
        : trackedAssets.regularCards.map(card => card.asset);
    }
    
    // Define excluded tokens
    const EXCLUDED_TOKEN_IDS = [
      "935701767940516955",  // wETH
      "2188455459770682500", // MANA
      "10230963490193589789", // GEM
      "13993107092599641878" // GIFTZ
    ];
    
    // Filter out excluded tokens
    const eligibleCardAssets = regularCardAssetIds.filter(id => !EXCLUDED_TOKEN_IDS.includes(id));
    
    // The morphing account is constant - verify with your game's correct morpher account
    const MORPH_ACCOUNT = "17043296434910227497";
    
    // Fetch all morphing transactions - transfers from the morph account with "cardmorph" message
    const morphTransactions = await fetchMorphTransactions(eligibleCardAssets, MORPH_ACCOUNT);
    
    // Process the raw transactions into morph objects
    const morphData = await processMorphData(morphTransactions);
    
    // Get the cutoff timestamp for the requested period
    const cutoffTimestamp = getPeriodFilter(period);
    
    // Filter by the requested period
    const filteredMorphs = morphData.filter(morph => morph.timestamp >= cutoffTimestamp);
    
    // Sort by timestamp (newest first)
    filteredMorphs.sort((a, b) => b.timestamp - a.timestamp);
    
    // Final result with processed morphs
    const result = {
      morphs: filteredMorphs, // Add property expected by frontend
      morphings: filteredMorphs,
      count: filteredMorphs.length,
      timestamp: new Date().toISOString(),
      period
    };
    
    console.log(`Found ${filteredMorphs.length} morphing operations for period ${period}`);
    
    // Save to cache
    writeJSON(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Error detecting morphings:', error.message);
    throw new Error(`Failed to fetch Ardor morphings: ${error.message}`);
  }
}

module.exports = { getMorphings };