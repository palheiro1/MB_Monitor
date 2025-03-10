const axios = require('axios');
const { readJSON, writeJSON } = require('../../utils/jsonStorage');
const { fetchMorphTransactions, processMorphData } = require('./morphingUtils');
const { ARDOR_API_URL } = require('../../config');
const { getTrackedAssets } = require('./assets');

/**
 * Get morphing operations with optional caching
 * @param {boolean} forceRefresh - Whether to force refresh the cache
 * @returns {Promise<Object>} Morphing data
 */
async function getMorphings(forceRefresh = false) {
  try {
    // Check cache first
    const cachedData = readJSON('ardor_morphings');
    if (cachedData && !forceRefresh) {
      return {
        morphs: cachedData.morphings || [], // Add compatibility with frontend expectations
        morphings: cachedData.morphings || [],
        count: cachedData.count || 0,
        timestamp: cachedData.timestamp
      };
    }
    
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
    
    // Final result with processed morphs
    const result = {
      morphs: morphData, // Add property expected by frontend
      morphings: morphData,
      count: morphData.length,
      timestamp: new Date().toISOString()
    };
    
    // Save to cache
    writeJSON('ardor_morphings', result);
    
    return result;
  } catch (error) {
    console.error('Error detecting morphings:', error.message);
    throw new Error(`Failed to fetch Ardor morphings: ${error.message}`);
  }
}

module.exports = { getMorphings };