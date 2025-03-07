const axios = require('axios');
const { readJSON, writeJSON } = require('../../utils/jsonStorage');
const { ARDOR_API_URL, ARDOR_CHAIN_ID, TOKEN_IDS } = require('../../config');
const { getTrackedAssets } = require('./assets');

// Special token to include, GIFTZ
const GIFTZ_TOKEN_ID = "13993107092599641878";

// Special tokens to exclude (WETH, MANA, GEM)
const EXCLUDED_TOKEN_IDS = [
  "935701767940516955",  // wETH
  "2188455459770682500", // MANA
  "10230963490193589789" // GEM
];

// Asset info cache to reduce API calls
const assetInfoCache = {};

/**
 * Extract card name from asset description
 * @param {Object} description - Asset description
 * @returns {string} Card name
 */
function extractCardName(description) {
  if (!description) return "Unknown Card";
  
  try {
    const descObj = JSON.parse(description);
    return descObj.name || "Unknown Card";
  } catch (e) {
    // Try regex as fallback
    const nameMatch = description.match(/"name"\s*:\s*"([^"]+)"/);
    if (nameMatch && nameMatch[1]) {
      return nameMatch[1];
    }
    return "Unknown Card";
  }
}

/**
 * Get asset info and cache it
 * @param {string} assetId - Asset ID
 * @returns {Promise<Object>} Asset info
 */
async function getAssetInfo(assetId) {
  // Check cache first
  if (assetInfoCache[assetId]) {
    return assetInfoCache[assetId];
  }
  
  try {
    const response = await axios.get(ARDOR_API_URL, {
      params: {
        requestType: 'getAsset',
        asset: assetId
      }
    });
    
    if (response.data && !response.data.errorCode) {
      // Extract card name if possible
      let cardName = response.data.name || `Asset ${assetId}`;
      
      if (response.data.description) {
        const extractedName = extractCardName(response.data.description);
        if (extractedName !== "Unknown Card") {
          cardName = extractedName;
        }
      }
      
      // Store in cache with enhanced information
      assetInfoCache[assetId] = {
        ...response.data,
        cardName: cardName
      };
      
      return assetInfoCache[assetId];
    }
    return null;
  } catch (error) {
    console.error(`Error fetching asset info for ${assetId}:`, error.message);
    return null;
  }
}

/**
 * Get all trades for an asset
 * @param {string} assetId - Asset ID
 * @returns {Promise<Array>} Trades
 */
async function getAssetTrades(assetId) {
  try {
    const response = await axios.get(ARDOR_API_URL, {
      params: {
        requestType: 'getTrades',
        asset: assetId,
        chain: ARDOR_CHAIN_ID,
        firstIndex: 0,
        lastIndex: 100,
        includeAssetInfo: true
      }
    });
    
    if (response.data && response.data.trades) {
      return response.data.trades;
    }
    return [];
  } catch (error) {
    console.error(`Error fetching trades for asset ${assetId}:`, error.message);
    return [];
  }
}

/**
 * Convert Ardor timestamp to ISO date string
 * @param {number} timestamp - Ardor timestamp
 * @returns {string} ISO date string
 */
function ardorTimestampToDate(timestamp) {
  // Ardor epoch start: January 1, 2018
  const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();
  return new Date(ARDOR_EPOCH + timestamp * 1000).toISOString();
}

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
 * Process and normalize a single trade
 * @param {Object} trade - Raw trade data
 * @param {Object} assetInfo - Asset info
 * @returns {Object} Normalized trade object
 */
function processTrade(trade, assetInfo) {
  const assetId = trade.asset || assetInfo?.asset;
  
  return {
    id: trade.askOrderFullHash || trade.bidOrderFullHash || `${trade.timestamp}-${assetId}`,
    blockchain: 'ardor',
    chain: ARDOR_CHAIN_ID,
    timestamp: parseInt(trade.timestamp),
    timestampISO: ardorTimestampToDate(parseInt(trade.timestamp)),
    card_name: assetInfo?.cardName || assetInfo?.name || `Asset ${assetId}`,
    seller: trade.sellerRS || trade.seller,
    buyer: trade.buyerRS || trade.buyer,
    price: parseInt(trade.priceNQT) / 100000000, // Convert NQT to IGNIS
    currency: 'IGNIS',
    asset_id: assetId,
    quantity: parseInt(trade.quantityQNT) || 1,
    transaction_hash: trade.askOrderFullHash || trade.bidOrderFullHash,
    block: trade.height || trade.block,
    raw_data: trade
  };
}

/**
 * Calculate trade statistics for different time periods
 * @param {Array} trades - Normalized trades
 * @returns {Object} Stats by period
 */
function calculateTradeStats(trades) {
  const now = new Date().getTime();
  const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();
  const currentTimestampArdor = Math.floor((now - ARDOR_EPOCH) / 1000);
  
  // Initialize stats
  const stats = {
    "24h": 0,
    "7d": 0,
    "30d": 0,
    "total": trades.length
  };
  
  // Calculate stats for each period
  trades.forEach(trade => {
    const timestamp = trade.timestamp;
    if (timestamp >= currentTimestampArdor - 86400) {
      stats["24h"]++;
    }
    if (timestamp >= currentTimestampArdor - 604800) {
      stats["7d"]++;
    }
    if (timestamp >= currentTimestampArdor - 2592000) {
      stats["30d"]++;
    }
  });
  
  return stats;
}

/**
 * Fetch all trades for tracked assets with filtering
 * @param {string} period - Time period to filter (24h, 7d, 30d, all)
 * @param {boolean} forceRefresh - Force refresh cache
 * @returns {Promise<Object>} Trades data
 */
async function getTrades(period = 'all', forceRefresh = false) {
  try {
    console.log('Fetching Ardor trades...');
    console.log(`Using period filter: ${period}, force refresh: ${forceRefresh ? 'yes' : 'no'}`);
    
    // We only need one master cache file
    const masterCacheKey = 'ardor_trades';
    let masterCache = readJSON(masterCacheKey);
    
    // If period is 'all' and we're not forcing a refresh, we can directly use the master cache if it exists
    if (period === 'all' && !forceRefresh && masterCache) {
      console.log(`Using existing master cache with ${masterCache.count} trades as period='all'`);
      
      // Add period and stats information to the result
      const result = {
        ...masterCache,
        period: 'all',
        stats: calculateTradeStats(masterCache.ardor_trades),
        totalTradesInCache: masterCache.count
      };
      
      return result;
    }
    
    // Check if we need to fetch all trades first (either forced or no cache exists)
    if (!masterCache || forceRefresh) {
      console.log('Main trade cache not found or refresh forced - fetching all trades...');
      
      // Get tracked assets
      const trackedAssets = await getTrackedAssets();
      console.log('Successfully fetched tracked assets');
      
      // Extract asset IDs for regular and special cards
      let regularCardAssetIds = [];
      if (trackedAssets.regularCards && Array.isArray(trackedAssets.regularCards)) {
        regularCardAssetIds = Array.isArray(trackedAssets.regularCards[0])
          ? trackedAssets.regularCards[0].map(card => card.asset)
          : trackedAssets.regularCards.map(card => card.asset);
      }
      
      let specialCardAssetIds = [];
      if (trackedAssets.specialCards && Array.isArray(trackedAssets.specialCards)) {
        specialCardAssetIds = Array.isArray(trackedAssets.specialCards[0])
          ? trackedAssets.specialCards[0].map(card => card.asset)
          : trackedAssets.specialCards.map(card => card.asset);
      }
      
      // Include GIFTZ token
      const assetIds = [...regularCardAssetIds, ...specialCardAssetIds, GIFTZ_TOKEN_ID];
      
      console.log(`Fetching trades for ${assetIds.length} assets (${regularCardAssetIds.length} regular cards, ${specialCardAssetIds.length} special cards, 1 GIFTZ token)`);
      
      // Collect all trades (without period filtering)
      let allTrades = [];
      let processedAssets = 0;
      
      // Process assets in batches to avoid overwhelming the API
      const batchSize = 10;
      for (let i = 0; i < assetIds.length; i += batchSize) {
        const batch = assetIds.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(assetIds.length/batchSize)}, assets: ${batch.join(', ').substring(0, 50)}...`);
        
        const batchResults = await Promise.all(batch.map(async (assetId) => {
          try {
            // Get trades for this asset - NO PERIOD FILTERING HERE
            const assetTrades = await getAssetTrades(assetId);
            console.log(`Found ${assetTrades.length} raw trades for asset ${assetId}`);
            
            // Get asset info for proper display names
            const assetInfo = await getAssetInfo(assetId);
            const assetName = assetInfo?.name || `Asset ${assetId}`;
            
            // Process trades without filtering by period
            const processedTrades = assetTrades.map(trade => processTrade(trade, assetInfo));
            
            console.log(`Processed ${processedTrades.length} trades for ${assetName}`);
            return processedTrades;
          } catch (error) {
            console.error(`Error processing asset ${assetId}:`, error.message);
            return [];
          }
        }));
        
        // Flatten batch results
        let batchTradeCount = 0;
        batchResults.forEach(trades => {
          batchTradeCount += trades.length;
          allTrades = [...allTrades, ...trades];
        });
        
        processedAssets += batch.length;
        console.log(`Batch complete with ${batchTradeCount} trades, total so far: ${allTrades.length}`);
        console.log(`Processed ${processedAssets}/${assetIds.length} assets...`);
      }
      
      // Check if we found any trades at all
      if (allTrades.length === 0) {
        console.warn('⚠️ WARNING: No trades found for any assets! This might indicate an API issue or data problem.');
        
        // Let's check a few assets individually as a diagnostic
        if (assetIds.length > 0) {
          console.log('Performing diagnostic checks on a few sample assets...');
          const sampleAssets = assetIds.slice(0, 3);
          
          for (const assetId of sampleAssets) {
            try {
              console.log(`Diagnostic check for asset ${assetId}:`);
              const response = await axios.get(ARDOR_API_URL, {
                params: {
                  requestType: 'getTrades',
                  asset: assetId,
                  chain: ARDOR_CHAIN_ID,
                  firstIndex: 0,
                  lastIndex: 10
                }
              });
              
              console.log(`API response for ${assetId}: ${JSON.stringify(response.data).substring(0, 200)}...`);
            } catch (error) {
              console.error(`Diagnostic API error for ${assetId}:`, error.message);
            }
          }
        }
      }
      
      // Sort by timestamp (newest first)
      allTrades.sort((a, b) => b.timestamp - a.timestamp);
      
      // Save the FULL dataset to the master cache
      masterCache = {
        ardor_trades: allTrades,
        count: allTrades.length,
        timestamp: new Date().toISOString()
      };
      
      // Write the master cache
      writeJSON(masterCacheKey, masterCache);
      console.log(`Master cache created with ${allTrades.length} total trades`);
    } else {
      console.log(`Using existing master cache with ${masterCache.count} trades`);
    }
    
    // Now filter the master cache based on the period parameter
    let filteredTrades = [];
    
    if (period === 'all') {
      // Return all trades from master cache
      filteredTrades = masterCache.ardor_trades;
      console.log(`Returning all ${filteredTrades.length} trades from master cache`);
    } else {
      // Apply filtering based on period
      const periodTimestamp = getPeriodFilter(period);
      
      filteredTrades = masterCache.ardor_trades.filter(
        trade => trade.timestamp >= periodTimestamp
      );
      
      console.log(`Filtered to ${filteredTrades.length} trades for period ${period}`);
    }
    
    // Calculate statistics for the filtered trades
    const stats = calculateTradeStats(filteredTrades);
    
    // Prepare the result with filtered data
    const result = {
      ardor_trades: filteredTrades,
      count: filteredTrades.length,
      stats: stats,
      timestamp: new Date().toISOString(),
      period: period,
      totalTradesInCache: masterCache.count
    };
    
    // No longer creating period-specific cache files
    
    console.log(`Returning ${filteredTrades.length} Ardor trades for period: ${period}`);
    console.log('Trade statistics:', stats);
    
    return result;
  } catch (error) {
    console.error('Error fetching Ardor trades:', error.message);
    throw new Error(`Failed to fetch Ardor trades: ${error.message}`);
  }
}

module.exports = { getTrades };