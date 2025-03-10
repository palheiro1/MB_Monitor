const axios = require('axios');
const { ARDOR_API_URL, ARDOR_CHAIN_ID } = require('../../config');
const { getTrackedAssets } = require('./assets');
const { getCachedData } = require('../../utils/cacheManager');

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

// Ardor epoch constant
const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();

// Function to convert Ardor timestamp to ISO date string
function ardorTimestampToISODate(timestamp) {
  return new Date(ARDOR_EPOCH + (timestamp * 1000)).toISOString();
}

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
 * Get asset details including name
 * @param {string} assetId - Asset ID
 * @returns {Promise<Object|null>} Asset details or null if not found
 */
async function getAssetDetails(assetId) {
  try {
    const response = await axios.get(ARDOR_API_URL, {
      params: {
        requestType: 'getAsset',
        asset: assetId,
        includeCounts: false
      }
    });
    
    if (response.data && response.data.name) {
      return {
        id: assetId,
        name: response.data.name,
        description: response.data.description
      };
    }
    return null;
  } catch (error) {
    console.warn(`Error fetching asset details for ${assetId}:`, error.message);
    return null;
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
    // Use the new unified cache approach
    return await getCachedData(
      'users', // data type
      period,  // period for filtering
      () => fetchAllUsersData(period), // Pass period to the function
      forceRefresh, // whether to force refresh
      {
        // Additional options for this data type
        timestampField: 'timestamp',
        dateField: 'last_seen',
        isoDateField: 'timestampISO',
        dataArrayField: 'ardor_users'
      }
    );
  } catch (error) {
    console.error('Error getting active users:', error.message);
    throw new Error(`Failed to get active users: ${error.message}`);
  }
}

/**
 * Fetch all users data - separated for clarity
 * @param {string} period - Time period to filter data by
 * @returns {Promise<Object>} All users data
 */
async function fetchAllUsersData(period = 'all') {
  console.log('Fetching fresh active users data');
  
  // Get all assets to track
  const trackedAssets = await getTrackedAssets();
  
  // Get cutoff timestamp based on period
  const cutoffTimestamp = getPeriodFilter(period);
  
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
  
  // Create a map of asset ids to their names for better display
  const assetDetails = {};
  
  // Instead of a Set, use an object to store users with their activities
  const activeUsersMap = {};
  
  // Process assets in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < assetIds.length; i += batchSize) {
    const batch = assetIds.slice(i, i + batchSize);
    
    // Get asset details for the batch
    const detailsPromises = batch.map(async assetId => {
      if (!assetDetails[assetId]) {
        const details = await getAssetDetails(assetId);
        if (details) {
          assetDetails[assetId] = details;
        }
      }
    });
    
    await Promise.all(detailsPromises);
    
    // Process each asset in the batch in parallel
    const batchPromises = batch.map(async assetId => {
      // Get transfers for this asset
      const transfers = await getAssetTransfers(assetId, cutoffTimestamp);
      
      // Extract detailed user activities from transfers
      transfers.forEach(transfer => {
        const sender = transfer.senderRS || transfer.sender;
        const recipient = transfer.recipientRS || transfer.recipient;
        const timestamp = parseInt(transfer.timestamp);
        const dateISO = ardorTimestampToISODate(timestamp);
        const assetName = assetDetails[assetId]?.name || 'Unknown Asset';
        
        // Add sender activity if not blacklisted
        if (sender && !blacklist.has(sender)) {
          if (!activeUsersMap[sender]) {
            activeUsersMap[sender] = {
              id: sender,
              address: sender,
              first_seen: dateISO,
              last_seen: dateISO,
              activities: []
            };
          }
          
          // Update last seen if this activity is newer
          if (dateISO > activeUsersMap[sender].last_seen) {
            activeUsersMap[sender].last_seen = dateISO;
          }
          
          // Add this activity
          activeUsersMap[sender].activities.push({
            type: 'transfer_send',
            timestamp: timestamp,
            dateISO: dateISO,
            assetId: assetId,
            assetName: assetName,
            quantity: transfer.quantityQNT || '1'
          });
        }
        
        // Add recipient activity if not blacklisted
        if (recipient && !blacklist.has(recipient)) {
          if (!activeUsersMap[recipient]) {
            activeUsersMap[recipient] = {
              id: recipient,
              address: recipient,
              first_seen: dateISO,
              last_seen: dateISO,
              activities: []
            };
          }
          
          // Update last seen if this activity is newer
          if (dateISO > activeUsersMap[recipient].last_seen) {
            activeUsersMap[recipient].last_seen = dateISO;
          }
          
          // Add this activity
          activeUsersMap[recipient].activities.push({
            type: 'transfer_receive',
            timestamp: timestamp,
            dateISO: dateISO,
            assetId: assetId,
            assetName: assetName,
            quantity: transfer.quantityQNT || '1'
          });
        }
      });
      
      // Get trades for this asset
      const trades = await getAssetTrades(assetId, cutoffTimestamp);
      
      // Extract detailed user activities from trades
      trades.forEach(trade => {
        const buyer = trade.buyerRS || trade.buyer;
        const seller = trade.sellerRS || trade.seller;
        const timestamp = parseInt(trade.timestamp);
        const dateISO = ardorTimestampToISODate(timestamp);
        const assetName = assetDetails[assetId]?.name || 'Unknown Asset';
        
        // Add buyer activity if not blacklisted
        if (buyer && !blacklist.has(buyer)) {
          if (!activeUsersMap[buyer]) {
            activeUsersMap[buyer] = {
              id: buyer,
              address: buyer,
              first_seen: dateISO,
              last_seen: dateISO,
              activities: []
            };
          }
          
          // Update last seen if this activity is newer
          if (dateISO > activeUsersMap[buyer].last_seen) {
            activeUsersMap[buyer].last_seen = dateISO;
          }
          
          // Add this activity
          activeUsersMap[buyer].activities.push({
            type: 'trade_buy',
            timestamp: timestamp,
            dateISO: dateISO,
            assetId: assetId,
            assetName: assetName,
            price: trade.priceNQTPerShare || '0',
            quantity: trade.quantityQNT || '1'
          });
        }
        
        // Add seller activity if not blacklisted
        if (seller && !blacklist.has(seller)) {
          if (!activeUsersMap[seller]) {
            activeUsersMap[seller] = {
              id: seller,
              address: seller,
              first_seen: dateISO,
              last_seen: dateISO,
              activities: []
            };
          }
          
          // Update last seen if this activity is newer
          if (dateISO > activeUsersMap[seller].last_seen) {
            activeUsersMap[seller].last_seen = dateISO;
          }
          
          // Add this activity
          activeUsersMap[seller].activities.push({
            type: 'trade_sell',
            timestamp: timestamp,
            dateISO: dateISO,
            assetId: assetId,
            assetName: assetName,
            price: trade.priceNQTPerShare || '0',
            quantity: trade.quantityQNT || '1'
          });
        }
      });
    });
    
    // Wait for all assets in this batch to be processed
    await Promise.all(batchPromises);
    
    console.log(`Processed ${Math.min(i + batchSize, assetIds.length)}/${assetIds.length} assets`);
  }
  
  // Convert active users map to array and summarize activity counts
  const activeUsersList = Object.values(activeUsersMap).map(user => {
    // Count different activity types
    const activityCounts = {
      trade_buy: 0,
      trade_sell: 0,
      transfer_send: 0,
      transfer_receive: 0
    };
    
    // Process all activities to calculate counts
    user.activities.forEach(activity => {
      if (activity.type in activityCounts) {
        activityCounts[activity.type]++;
      }
    });
    
    // Sort activities by timestamp (most recent first)
    const sortedActivities = [...user.activities].sort((a, b) => b.timestamp - a.timestamp);
    
    // Take the most recent 10 activities
    const recentActivities = sortedActivities.slice(0, 10);
    
    return {
      id: user.address,
      address: user.address,
      first_seen: user.first_seen,
      last_seen: user.last_seen,
      trades_count: activityCounts.trade_buy + activityCounts.trade_sell,
      trades_buy_count: activityCounts.trade_buy,
      trades_sell_count: activityCounts.trade_sell,
      transfers_count: activityCounts.transfer_send + activityCounts.transfer_receive,
      transfers_send_count: activityCounts.transfer_send,
      transfers_receive_count: activityCounts.transfer_receive,
      recent_activities: recentActivities,
      total_activities: user.activities.length,
      network: 'ardor'
    };
  });
  
  // Create result object
  const result = {
    ardor_users: activeUsersList,
    activeUsers: activeUsersList.length,
    count: activeUsersList.length,
    timestamp: new Date().toISOString()
  };
  
  console.log(`Found ${activeUsersList.length} active users`);
  
  // Return the FULL unfiltered data to be cached
  return result;
}

module.exports = { getActiveUsers };