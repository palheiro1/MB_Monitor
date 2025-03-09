const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { readJSON, writeJSON } = require('../../utils/jsonStorage');
const { 
  ARDOR_API_URL, 
  ARDOR_BURN_ACCOUNT, 
  BURN_START_DATE,
  GEM_ASSET_ID,
  ARDOR_CHAIN_ID
} = require('../../config');
const { getTrackedAssets } = require('./assets');

/**
 * Helper to convert Ardor timestamp to ISO date string
 */
function ardorTimestampToDate(timestamp) {
  // Ardor epoch start (January 1, 2018)
  const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();
  return new Date(ARDOR_EPOCH + timestamp * 1000).toISOString();
}

/**
 * Get burn start timestamp in Ardor format
 * @returns {number} Burn start timestamp in Ardor format
 */
function getBurnStartTimestamp() {
  const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();
  const burnDate = new Date(BURN_START_DATE);
  return Math.floor((burnDate.getTime() - ARDOR_EPOCH) / 1000);
}

/**
 * Helper to fetch asset info
 * @param {string} assetId - Asset ID
 * @returns {Promise<Object>} Asset info
 */
async function getAssetInfo(assetId) {
  try {
    const response = await axios.get(ARDOR_API_URL, {
      params: {
        requestType: 'getAsset',
        asset: assetId
      }
    });
    
    return {
      assetId,
      name: response.data?.name || `Asset #${assetId}`,
      description: response.data?.description || '',
      decimals: response.data?.decimals || 0
    };
  } catch (error) {
    console.error(`Error fetching info for asset ${assetId}:`, error.message);
    return {
      assetId,
      name: `Asset #${assetId}`,
      description: '',
      decimals: 0
    };
  }
}

/**
 * Process and normalize a single burn transaction
 * @param {Object} burn - Raw burn transaction data
 * @param {Object} assetInfo - Asset info
 * @returns {Object} Normalized burn object
 */
function processBurn(burn, assetInfo) {
  const assetId = burn.attachment?.assetId || assetInfo?.asset;
  
  return {
    id: burn.transaction || burn.fullHash || `${burn.timestamp}-${assetId}`,
    blockchain: 'ardor',
    chain: ARDOR_CHAIN_ID,
    timestamp: parseInt(burn.timestamp),
    timestampISO: ardorTimestampToDate(parseInt(burn.timestamp)),
    cardName: assetInfo?.cardName || assetInfo?.name || `Asset ${assetId}`,
    sender: burn.senderRS || burn.sender,
    price: 0,
    currency: 'IGNIS',
    asset_id: assetId,
    quantity: parseInt(burn.attachment?.quantityQNT) || 1,
    transaction_hash: burn.fullHash || burn.transaction,
    block_number: burn.height || burn.block,
    raw_data: burn
  };
}

/**
 * Fetch card burns (transfers to burn account)
 * @param {boolean} forceRefresh - Force refresh cache
 * @returns {Promise<Object>} Burn data
 */
async function getCardBurns(forceRefresh = false) {
  try {
    console.log('Fetching Ardor card burns...');
    console.log(`Using burn account: ${ARDOR_BURN_ACCOUNT} on chain: ${ARDOR_CHAIN_ID} (IGNIS)`);
    
    // Clear cache if forced refresh
    const cacheFile = path.join(__dirname, '../../storage/ardor_card_burns.json');
    if (forceRefresh && fs.existsSync(cacheFile)) {
      console.log('Forcing cache refresh');
      fs.unlinkSync(cacheFile);
    }
    
    // Check JSON file first
    const cachedData = readJSON('ardor_card_burns');
    if (cachedData && !forceRefresh) {
      return cachedData;
    }
    
    const burnStartTimestampArdor = getBurnStartTimestamp();
    console.log(`Burn start timestamp (Ardor epoch): ${burnStartTimestampArdor}`);
    
    // Get all tracked assets
    const trackedAssets = await getTrackedAssets();
    
    // Extract regular card asset IDs
    let regularCardAssetIds = [];
    if (trackedAssets.regularCards && Array.isArray(trackedAssets.regularCards)) {
      // Handle possibly nested arrays
      if (trackedAssets.regularCards.length > 0 && Array.isArray(trackedAssets.regularCards[0])) {
        regularCardAssetIds = trackedAssets.regularCards[0].map(asset => asset.asset);
      } else {
        regularCardAssetIds = trackedAssets.regularCards.map(asset => asset.asset);
      }
    }
    
    console.log(`Checking ${regularCardAssetIds.length} regular card assets for burns`);
    
    // Initialize result
    const result = {
      burns: [],
      count: 0,
      timestamp: new Date().toISOString()
    };
    
    // For each asset, check for transfers
    for (const assetId of regularCardAssetIds) {
      try {
        // Get asset transfers for this asset WITH recipient pre-filtering
        const response = await axios.get(ARDOR_API_URL, {
          params: {
            requestType: 'getAssetTransfers',
            asset: assetId,
            recipientRS: ARDOR_BURN_ACCOUNT, // Pre-filter by recipient in API call
            chain: ARDOR_CHAIN_ID, // IGNIS chain
            firstIndex: 0,
            lastIndex: 100
          }
        });
        
        // Check response validity
        if (!response.data || response.data.errorCode || !response.data.transfers || !Array.isArray(response.data.transfers)) {
          continue;
        }
        
        // Double-check that transfers are to the burn account AND after the start date
        const burns = response.data.transfers.filter(transfer => {
          if (!transfer || !transfer.timestamp) return false;
          
          const transferTime = parseInt(transfer.timestamp);
          const isAfterStartDate = transferTime >= burnStartTimestampArdor;
          const isToBurnAccount = transfer.recipientRS === ARDOR_BURN_ACCOUNT;
          
          // We expect all transfers to be to burn account since we filtered in the API
          // but we check again for safety
          return isAfterStartDate && isToBurnAccount;
        });
        
        if (burns.length > 0) {
          // Get asset info for enriching the burn records
          const assetInfo = await getAssetInfo(assetId);
          
          // Add asset info to each burn
          const burnDetails = burns.map(burn => {
            // Safely create hash identifier - use either fullHash or assetTransferFullHash
            const fullHash = burn.fullHash || burn.assetTransferFullHash;
            const id = fullHash || `${burn.timestamp}-${assetId}-${Math.random().toString(36).substring(2, 15)}`;
            
            return {
              ...burn,
              id,
              fullHash, // Ensure fullHash is set
              assetId,
              assetName: assetInfo.name,
              assetDescription: assetInfo.description,
              burnDate: ardorTimestampToDate(parseInt(burn.timestamp)),
              quantityFormatted: parseInt(burn.quantityQNT) / Math.pow(10, assetInfo.decimals)
            };
          });
          
          result.burns.push(...burnDetails);
        }
      } catch (error) {
        console.error(`Error fetching burns for asset ${assetId}:`, error.message);
      }
    }
    
    // Update count
    result.count = result.burns.length;
    console.log(`Found ${result.count} card burns in total`);
    
    // Final safety check to make sure all transfers are to burn account
    const nonBurnTransfers = result.burns.filter(burn => burn.recipientRS !== ARDOR_BURN_ACCOUNT);
    if (nonBurnTransfers.length > 0) {
      console.warn(`WARNING: Found ${nonBurnTransfers.length} transfers that are not to the burn account`);
      
      // Remove non-burn transfers
      result.burns = result.burns.filter(burn => burn.recipientRS === ARDOR_BURN_ACCOUNT);
      result.count = result.burns.length;
      
      console.log(`After filtering, ${result.count} burn transfers remain`);
    }
    
    // Save to JSON file
    writeJSON('ardor_card_burns', result);
    
    return result;
  } catch (error) {
    console.error('Error fetching Ardor card burns:', error.message);
    throw new Error(`Failed to fetch Ardor card burns: ${error.message}`);
  }
}

/**
 * Fetch GEM token transfers to burn account
 * @param {boolean} forceRefresh - Force refresh cache
 * @returns {Promise<Object>} GEM transfer data
 */
async function getGEMBurns(forceRefresh = true) { // Force refresh by default
  try {
    console.log('Fetching Ardor GEM burns...');
    console.log(`Using burn account: ${ARDOR_BURN_ACCOUNT} and GEM asset ID: ${GEM_ASSET_ID} on chain: ${ARDOR_CHAIN_ID} (IGNIS)`);
    
    // Clear cache if forced refresh
    const cacheFile = path.join(__dirname, '../../storage/ardor_gem_burns.json');
    if (forceRefresh && fs.existsSync(cacheFile)) {
      console.log('Forcing cache refresh');
      fs.unlinkSync(cacheFile);
    }
    
    const cachedData = readJSON('ardor_gem_burns');
    if (cachedData && !forceRefresh) {
      return cachedData;
    }
    
    const burnStartTimestampArdor = getBurnStartTimestamp();
    console.log(`Current date: ${new Date().toISOString()}`);
    console.log(`Burn start date: ${BURN_START_DATE}`);
    console.log(`Burn start timestamp (Ardor epoch): ${burnStartTimestampArdor}`);
    
    // Initialize result
    const result = {
      transfers: [],
      count: 0,
      totalAmount: 0,
      timestamp: new Date().toISOString()
    };
    
    // Get GEM token info first
    const assetInfo = await getAssetInfo(GEM_ASSET_ID);
    console.log(`Fetching transfers for GEM token (${GEM_ASSET_ID}) with name: ${assetInfo.name}`);
    
    // Use IGNIS chain (2) and get transfers to burn account
    const response = await axios.get(ARDOR_API_URL, {
      params: {
        requestType: 'getAssetTransfers',
        asset: GEM_ASSET_ID,
        recipientRS: ARDOR_BURN_ACCOUNT,
        chain: ARDOR_CHAIN_ID,
        firstIndex: 0,
        lastIndex: 500
      }
    });
    
    if (!response.data || !response.data.transfers || !response.data.transfers.length) {
      console.log('No GEM transfers found to burn account');
      writeJSON('ardor_gem_burns', result);
      return result;
    }
    
    const allTransfers = response.data.transfers;
    console.log(`Found ${allTransfers.length} GEM transfers to burn account`);
    
    // Log some details of first few transfers for debugging
    allTransfers.slice(0, 3).forEach((t, i) => {
      console.log(`Transfer ${i+1}: ID=${t.fullHash?.substring(0,8) || 'unknown'}, Date=${ardorTimestampToDate(parseInt(t.timestamp))}, Recipient=${t.recipientRS}`);
    });
    
    // Double-check that transfers are to the burn account AND after the start date
    const gemBurns = allTransfers.filter(transfer => {
      if (!transfer || !transfer.timestamp) return false;
      
      const transferTime = parseInt(transfer.timestamp);
      const isAfterStartDate = transferTime >= burnStartTimestampArdor;
      const isToBurnAccount = transfer.recipientRS === ARDOR_BURN_ACCOUNT;
      
      if (!isAfterStartDate) {
        console.log(`Transfer ${transfer.fullHash?.substring(0,8) || 'unknown'} is before start date: ${ardorTimestampToDate(transferTime)}`);
      }
      
      return isAfterStartDate && isToBurnAccount;
    });
    
    console.log(`Found ${gemBurns.length} GEM burns after start date`);
    
    if (gemBurns.length > 0) {
      // Add asset info to each transfer
      const transferDetails = gemBurns.map(transfer => {
        // Safely create hash identifier
        const fullHash = transfer.fullHash || transfer.assetTransferFullHash;
        const id = fullHash || `${transfer.timestamp}-${GEM_ASSET_ID}-${Math.random().toString(36).substring(2, 15)}`;
        
        return {
          ...transfer,
          id,
          fullHash,
          chain: ARDOR_CHAIN_ID,
          assetId: GEM_ASSET_ID,
          assetName: assetInfo.name,
          burnDate: ardorTimestampToDate(parseInt(transfer.timestamp)),
          quantityFormatted: parseInt(transfer.quantityQNT) / Math.pow(10, assetInfo.decimals)
        };
      });
      
      result.transfers = transferDetails;
      result.count = transferDetails.length;
      
      // Calculate total amount
      result.totalAmount = transferDetails.reduce(
        (sum, transfer) => sum + (parseInt(transfer.quantityQNT) / Math.pow(10, assetInfo.decimals)), 
        0
      );
    }
    
    console.log(`Found ${result.count} total GEM transfers to burn account with total ${result.totalAmount} GEM burned`);
    
    // Save to JSON file
    writeJSON('ardor_gem_burns', result);
    
    return result;
  } catch (error) {
    console.error('Error fetching Ardor GEM burns:', error.message);
    throw new Error(`Failed to fetch Ardor GEM burns: ${error.message}`);
  }
}

/**
 * Get burns for a given period
 * @param {string} period - Time period (e.g., '24h', '7d', '30d', 'all')
 * @param {boolean} forceRefresh - Force refresh of cache
 * @returns {Promise<Object>} - Burns data
 */
async function getBurns(period = 'all', forceRefresh = false) {
  try {
    // Check for cached data
    const cachedData = readJSON('ardor_gem_burns');
    
    if (!forceRefresh && cachedData) {
      console.log(`Using cached burns data with ${cachedData.count} entries`);
      return cachedData;
    }
    
    console.log('Fetching burn data - no cache or refresh forced');
    
    // No period filtering - fetch and return all burns
    const burns = await fetchAllBurns();
    
    const data = {
      burns: burns,
      count: burns.length,
      totalAmount: calculateTotalGemsBurned(burns),
      timestamp: new Date().toISOString()
    };
    
    // Cache the data
    writeJSON('ardor_gem_burns', data);
    console.log(`Cached ${burns.length} burns to file`);
    
    return data;
  } catch (error) {
    console.error('Error in getBurns:', error);
    throw error;
  }
}

// Module exports
module.exports = { getCardBurns, getGEMBurns, getBurns };