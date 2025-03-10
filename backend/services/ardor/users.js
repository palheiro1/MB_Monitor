const axios = require('axios');
const { readJSON, writeJSON } = require('../../utils/jsonStorage');
const { ARDOR_API_URL, ARDOR_CHAIN_ID } = require('../../config');
const { getTrackedAssets } = require('./assets');

// Define company accounts that should be excluded
const COMPANY_BLACKLIST = [
  'ARDOR-ARQZ-MDV2-EX9E-4NEGZ',
  'ARDOR-8WCM-6LBD-3AC9-9F22P',
  'ARDOR-LZ8A-PVC2-BMT7-C6346',
  'ARDOR-4V3B-TVQA-Q6LF-GMH3T',
  'ARDOR-5NCL-DRBZ-XBWF-DDN5T',
  'ARDOR-WLUP-RY4G-FZVD-65T3A',
  'ARDOR-AS2E-5QF9-8LHR-8ZKXK'
];

// Also have numeric account IDs for efficiency
const getNumericBlacklist = async () => {
  const numericIds = [];
  for (const address of COMPANY_BLACKLIST) {
    try {
      const response = await axios.get(ARDOR_API_URL, {
        params: {
          requestType: 'getAccountId',
          account: address
        }
      });
      if (response.data && response.data.account) {
        numericIds.push(response.data.account);
      }
    } catch (error) {
      console.error(`Failed to get numeric ID for ${address}:`, error.message);
    }
  }
  return numericIds;
};

// Generate a time-based period filter
function getPeriodFilter(period) {
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
 * Fetch transfers for an asset
 * @param {string} assetId - Asset ID 
 * @param {number} cutoffTimestamp - Timestamp to filter from
 * @returns {Promise<Array>} Asset transfers
 */
async function getAssetTransfers(assetId, cutoffTimestamp = 0) {
  try {
    const transfers = [];
    let firstIndex = 0;
    const batchSize = 100;
    let hasMore = true;
    
    while (hasMore) {
      const response = await axios.get(ARDOR_API_URL, {
        params: {
          requestType: 'getAssetTransfers',
          asset: assetId,
          chain: ARDOR_CHAIN_ID,
          firstIndex,
          lastIndex: firstIndex + batchSize - 1
        }
      });
      
      if (!response.data || !response.data.transfers || !response.data.transfers.length) {
        hasMore = false;
        continue;
      }
      
      const batch = response.data.transfers;
      
      // Filter by timestamp and add to results
      const filteredBatch = batch.filter(transfer => 
        !cutoffTimestamp || transfer.timestamp >= cutoffTimestamp
      );
      
      transfers.push(...filteredBatch);
      
      // Check if we need to fetch more
      if (batch.length < batchSize) {
        hasMore = false;
      } else {
        firstIndex += batchSize;
      }
    }
    
    return transfers;
  } catch (error) {
    console.error(`Error fetching transfers for asset ${assetId}:`, error.message);
    return [];
  }
}

/**
 * Fetch trades for an asset
 * @param {string} assetId - Asset ID
 * @param {number} cutoffTimestamp - Timestamp to filter from
 * @returns {Promise<Array>} Asset trades
 */
async function getAssetTrades(assetId, cutoffTimestamp = 0) {
  try {
    const trades = [];
    let firstIndex = 0;
    const batchSize = 100;
    let hasMore = true;
    
    while (hasMore) {
      const response = await axios.get(ARDOR_API_URL, {
        params: {
          requestType: 'getTrades',
          asset: assetId,
          chain: ARDOR_CHAIN_ID,
          firstIndex,
          lastIndex: firstIndex + batchSize - 1
        }
      });
      
      if (!response.data || !response.data.trades || !response.data.trades.length) {
        hasMore = false;
        continue;
      }
      
      const batch = response.data.trades;
      
      // Filter by timestamp and add to results
      const filteredBatch = batch.filter(trade => 
        !cutoffTimestamp || trade.timestamp >= cutoffTimestamp
      );
      
      trades.push(...filteredBatch);
      
      // Check if we need to fetch more
      if (batch.length < batchSize) {
        hasMore = false;
      } else {
        firstIndex += batchSize;
      }
    }
    
    return trades;
  } catch (error) {
    console.error(`Error fetching trades for asset ${assetId}:`, error.message);
    return [];
  }
}

/**
 * Get active users across all assets
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @param {boolean} forceRefresh - Force refresh cache
 * @returns {Promise<Object>} Active users data
 */
async function getActiveUsers(period = 'all', forceRefresh = false) {
  try {
    // Check cache first if not forcing refresh
    const cacheKey = `ardor_active_users_${period}`;
    const cachedData = readJSON(cacheKey);
    if (cachedData && !forceRefresh) {
      console.log(`Using cached active users data for period ${period}`);
      return cachedData;
    }
    
    console.log(`Calculating active users for period: ${period}`);
    
    // Get cutoff timestamp based on period
    const cutoffTimestamp = getPeriodFilter(period);
    
    // Get all assets to track (Regular Cards, Special Cards, and specific tokens)
    const trackedAssets = await getTrackedAssets();
    
    // Collect all asset IDs
    const assetIds = [
      ...(trackedAssets.regularCards || []).map(card => card.asset),
      ...(trackedAssets.specialCards || []).map(card => card.asset),
      ...(trackedAssets.specificTokens || [])
    ];
    
    // Make sure we have the specific tokens we care about
    const specificTokens = [
      '10230963490193589789', // GEM
      '2188455459770682500',  // MANA
      '13993107092599641878', // GIFTZ
      '935701767940516955'    // wETH
    ];
    
    // Add any missing specific tokens
    specificTokens.forEach(tokenId => {
      if (!assetIds.includes(tokenId)) {
        assetIds.push(tokenId);
      }
    });
    
    console.log(`Tracking activity across ${assetIds.length} assets`);
    
    // Get company account blacklist (both RS and numeric format)
    const blacklistNumeric = await getNumericBlacklist();
    const blacklist = new Set([...COMPANY_BLACKLIST, ...blacklistNumeric]);
    
    // Track unique active users
    const activeUsers = new Set();
    
    // Process assets in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < assetIds.length; i += batchSize) {
      const batch = assetIds.slice(i, i + batchSize);
      
      // Process each asset in the batch in parallel
      const batchPromises = batch.map(async assetId => {
        // Get transfers for this asset
        const transfers = await getAssetTransfers(assetId, cutoffTimestamp);
        
        // Extract unique users from transfers
        transfers.forEach(transfer => {
          const sender = transfer.senderRS || transfer.sender;
          const recipient = transfer.recipientRS || transfer.recipient;
          
          // Add to active users if not blacklisted
          if (sender && !blacklist.has(sender)) activeUsers.add(sender);
          if (recipient && !blacklist.has(recipient)) activeUsers.add(recipient);
        });
        
        // Get trades for this asset
        const trades = await getAssetTrades(assetId, cutoffTimestamp);
        
        // Extract unique users from trades
        trades.forEach(trade => {
          const buyer = trade.buyerRS || trade.buyer;
          const seller = trade.sellerRS || trade.seller;
          
          // Add to active users if not blacklisted
          if (buyer && !blacklist.has(buyer)) activeUsers.add(buyer);
          if (seller && !blacklist.has(seller)) activeUsers.add(seller);
        });
      });
      
      // Wait for all assets in this batch to be processed
      await Promise.all(batchPromises);
      
      console.log(`Processed ${Math.min(i + batchSize, assetIds.length)}/${assetIds.length} assets`);
    }
    
    // Convert active users to array for the result
    const activeUsersList = Array.from(activeUsers);
    
    // Create result object
    const result = {
      ardor_users: activeUsersList.map(address => ({
        id: address,
        address: address,
        first_seen: new Date().toISOString(),
        network: 'ardor'
      })),
      activeUsers: activeUsersList.length,
      count: activeUsersList.length,
      timestamp: new Date().toISOString(),
      period: period
    };
    
    console.log(`Found ${activeUsersList.length} active users for period ${period}`);
    
    // Save to cache
    writeJSON(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Error getting active users:', error.message);
    throw new Error(`Failed to get active users: ${error.message}`);
  }
}

module.exports = { getActiveUsers };