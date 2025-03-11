/**
 * Ardor Morphing Service
 * 
 * Handles detection and processing of card morphing operations
 */
const axios = require('axios');
const { getCachedData } = require('../../utils/cacheManager');
const { writeJSON } = require('../../utils/jsonStorage'); // FIX: Import from correct module
const { ARDOR_API_URL, ARDOR_CHAIN_ID, MORPH_ACCOUNT } = require('../../config');
const { getTrackedAssets } = require('./assets');
const { fetchMorphTransactions, processMorphData, ardorTimestampToDate } = require('./morphingUtils');
const { getCacheStats } = require('../../utils/apiUtils');

// Constants
const MORPHING_MESSAGE = "cardmorph";
const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();

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
 * Get all morphing operations
 * @param {boolean} forceRefresh - Whether to force refresh cache
 * @param {string} period - Time period to filter (24h, 7d, 30d, all)
 * @returns {Promise<Object>} Morphing data
 */
async function getMorphings(forceRefresh = false, period = 'all') {
  try {
    console.log(`Getting morphings with forceRefresh=${forceRefresh}, period=${period}`);
    
    // Always force refresh on first call after server start
    if (!getMorphings.initialized) {
      console.log('First call to getMorphings, forcing refresh');
      forceRefresh = true;
      getMorphings.initialized = true;
    }
    
    // Standardize on 'morphs' as the data type for consistency with frontend
    // This will use ardor_morphs.json as the cache file
    return await getCachedData(
      'morphs',     // Changed from 'morphings' to 'morphs' for consistency
      period,        // period for filtering
      fetchMorphingsData, // function to fetch fresh data
      forceRefresh,  // whether to force refresh
      {
        // Additional options for filtering
        timestampField: 'timestamp',
        dateField: 'timestampISO',
        dataArrayField: 'morphs'
      }
    );
  } catch (error) {
    console.error('Error fetching morphings:', error.message);
    throw new Error(`Failed to fetch morphings: ${error.message}`);
  }
}
// Initialize the static property
getMorphings.initialized = false;

/**
 * Fetch all morphing data
 * @returns {Promise<Object>} All morphing data
 */
async function fetchMorphingsData() {
  console.log('Fetching fresh morphing data...');
  
  try {
    // Get the tracked assets
    const trackedAssets = await getTrackedAssets();
    console.log(`Tracked assets data structure: ${typeof trackedAssets}`);
    
    // Extract asset IDs - ONLY FROM REGULAR CARDS (special cards can't be morphed)
    let cardAssets = [];
    
    // Debug the structure of regularCards more deeply
    if (Array.isArray(trackedAssets.regularCards)) {
      const firstItem = trackedAssets.regularCards[0];
      console.log(`First item in regularCards is type: ${typeof firstItem}`);
      console.log(`Is first item an array?: ${Array.isArray(firstItem)}`);
      
      // Handle case where regularCards is an array of arrays (nested structure)
      if (Array.isArray(firstItem)) {
        console.log('Detected nested array structure in regularCards');
        
        // Iterate through each sub-array
        trackedAssets.regularCards.forEach((cardArray, index) => {
          if (Array.isArray(cardArray)) {
            console.log(`Processing nested array at index ${index} with ${cardArray.length} items`);
            
            // Process each card in the nested array
            cardArray.forEach((card, cardIndex) => {
              if (card && typeof card === 'object') {
                // Check different property names that might contain the asset ID
                if (card.asset) {
                  cardAssets.push(card.asset);
                  if (cardAssets.length <= 5) {
                    console.log(`Found card asset ID: ${card.asset}`);
                  }
                } else if (card.assetId) {
                  cardAssets.push(card.assetId);
                  if (cardAssets.length <= 5) {
                    console.log(`Found card asset ID from assetId: ${card.assetId}`);
                  }
                } else if (card.assetIdString) {
                  cardAssets.push(card.assetIdString);
                  if (cardAssets.length <= 5) {
                    console.log(`Found card asset ID from assetIdString: ${card.assetIdString}`);
                  }
                } else {
                  // If we get here, log a detailed sample of what we're seeing
                  if (cardIndex === 0) {
                    console.log(`Card object keys: ${Object.keys(card).join(', ')}`);
                    console.log(`Sample card object: ${JSON.stringify(card).substring(0, 200)}...`);
                  }
                }
              }
            });
          }
        });
      } else {
        // Original processing for flat array structure
        trackedAssets.regularCards.forEach((card, index) => {
          if (card && typeof card === 'object') {
            if (card.asset) {
              cardAssets.push(card.asset);
              if (index < 5) {
                console.log(`Found regular card asset ID: ${card.asset} (${card.name || 'unnamed'})`);
              }
            } else {
              console.log(`Missing asset ID in regular card at index ${index}:`, JSON.stringify(card).substring(0, 100) + '...');
            }
          } else {
            console.log(`Invalid regular card at index ${index}:`, card);
          }
        });
      }
    } else {
      console.warn('Regular cards is not an array:', trackedAssets.regularCards);
    }
    
    console.log(`Found ${cardAssets.length} regular card assets to check for morphing operations`);
    
    if (cardAssets.length === 0) {
      // Try more aggressive alternative approach
      console.warn('No card assets found with standard methods. Trying deep recursive search...');
      
      // Helper function to recursively search for asset IDs
      function findAssetIds(obj, depth = 0, maxDepth = 3) {
        // Don't go too deep
        if (depth > maxDepth) return;
        
        if (Array.isArray(obj)) {
          // Search through array elements
          obj.forEach(item => findAssetIds(item, depth + 1, maxDepth));
        } else if (obj && typeof obj === 'object') {
          // Look for asset ID in this object
          for (const key in obj) {
            // Check if this is an asset ID property
            if ((key === 'asset' || key === 'assetId' || key === 'assetIdString') && 
                (typeof obj[key] === 'string' || typeof obj[key] === 'number')) {
              cardAssets.push(obj[key].toString());
              if (cardAssets.length <= 10) {
                console.log(`Found asset ID via deep search: ${obj[key]} (in property '${key}')`);
              }
              continue;
            }
            
            // Recurse into nested objects/arrays
            if (obj[key] && (typeof obj[key] === 'object')) {
              findAssetIds(obj[key], depth + 1, maxDepth);
            }
          }
        }
      }
      
      // Start recursive search from trackedAssets
      findAssetIds(trackedAssets);
      
      console.log(`After deep search, found ${cardAssets.length} potential card assets`);
      
      if (cardAssets.length === 0) {
        return { morphs: [], count: 0, timestamp: new Date().toISOString() };
      }
    }
    
    // Remove duplicates from cardAssets
    cardAssets = [...new Set(cardAssets)];
    console.log(`After removing duplicates: ${cardAssets.length} unique card assets`);
    
    // Fetch morph transactions for these assets
    const morphAccount = MORPH_ACCOUNT || '';
    console.log(`Using morph account: ${morphAccount || 'None (will check all transactions)'}`);
    
    // Only fetch outgoing transfers from the morph account
    const transfers = await fetchMorphTransactions(cardAssets, morphAccount);
    
    console.log(`Found ${transfers.length} potential morph transfers to process`);
    
    // Get cache stats before processing
    const beforeCacheStats = getCacheStats();
    console.log(`Cache stats before processing: ${JSON.stringify(beforeCacheStats)}`);
    
    // Process the transfers to identify actual morph operations
    const morphs = await processMorphData(transfers);
    
    // Get cache stats after processing to measure efficiency
    const afterCacheStats = getCacheStats();
    console.log(`Cache stats after processing: ${JSON.stringify(afterCacheStats)}`);
    console.log(`Cache efficiency: ${afterCacheStats.valid - beforeCacheStats.valid} new cached items used`);
    
    console.log(`Successfully identified ${morphs.length} valid morphing operations`);
    
    // Add more logging for debugging message issues
    if (morphs.length === 0 && transfers.length > 0) {
      console.log(`No valid morph operations found despite having ${transfers.length} transfers. Check message parsing logic.`);
    } else if (morphs.length > 0) {
      console.log(`Example of a successful morph operation: ${JSON.stringify(morphs[0]).substring(0, 250)}...`);
    }
    
    // Sort by timestamp (newest first)
    morphs.sort((a, b) => b.timestamp - a.timestamp);
    
    // Create result object
    const result = {
      morphs,
      count: morphs.length,
      timestamp: new Date().toISOString()
    };
    
    // Save the results to a standardized JSON file for debugging
    writeJSON('morphs_debug', result);
    
    return result;
  } catch (error) {
    console.error('Error fetching morphing data:', error);
    // Return empty result on error
    return { morphs: [], count: 0, timestamp: new Date().toISOString() };
  }
}

module.exports = { getMorphings };