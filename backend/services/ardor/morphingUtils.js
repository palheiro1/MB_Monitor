const axios = require('axios');
const { ARDOR_API_URL, ARDOR_CHAIN_ID } = require('../../config');

// Ardor epoch constant
const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();

/**
 * Convert Ardor timestamp to ISO date string
 * @param {number} timestamp - Ardor timestamp
 * @returns {string} ISO date string
 */
function ardorTimestampToDate(timestamp) {
  return new Date(ARDOR_EPOCH + timestamp * 1000).toISOString();
}

/**
 * Asset info cache to reduce API calls
 */
const assetInfoCache = {};

/**
 * Fetch asset info
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
    
    if (!response.data || response.data.errorCode) {
      console.error(`Failed to get asset info for ${assetId}:`, response.data?.errorDescription || 'Unknown error');
      return null;
    }
    
    // Extract card name from asset data
    let cardName = response.data.name || `Asset ${assetId}`;
    
    // Try to extract from JSON description if available
    if (response.data.description) {
      try {
        const descObj = JSON.parse(response.data.description);
        if (descObj.name) {
          cardName = descObj.name;
        }
      } catch (e) {
        // Not JSON or missing name property - use API name
      }
    }
    
    // Cache the result
    const assetInfo = {
      ...response.data,
      cardName,
      assetId
    };
    
    assetInfoCache[assetId] = assetInfo;
    return assetInfo;
  } catch (error) {
    console.error(`Error fetching asset info for ${assetId}:`, error.message);
    return null;
  }
}

/**
 * Fetch all asset transfers for a list of assets
 * @param {Array} assetIds - List of asset IDs
 * @param {string} senderAccount - Sender account ID
 * @returns {Promise<Array>} Asset transfers
 */
async function fetchMorphTransactions(assetIds, senderAccount) {
  let allMorphs = [];
  const batchSize = 10; // Process in small batches to avoid overwhelming the API
  
  for (let i = 0; i < assetIds.length; i += batchSize) {
    const batchAssetIds = assetIds.slice(i, i + batchSize);
    
    const batchPromises = batchAssetIds.map(async (assetId) => {
      try {
        const response = await axios.get(ARDOR_API_URL, {
          params: {
            requestType: 'getAssetTransfers',
            asset: assetId,
            account: senderAccount,
            chain: ARDOR_CHAIN_ID,
            firstIndex: 0,
            lastIndex: 100
          }
        });
        
        if (!response.data || !response.data.transfers || !Array.isArray(response.data.transfers)) {
          return [];
        }
        
        // Add reference to the asset ID in each transfer
        const assetTransfers = response.data.transfers.map(transfer => ({
          ...transfer,
          assetId
        }));
        
        return assetTransfers;
      } catch (error) {
        console.error(`Error fetching transfers for asset ${assetId}:`, error.message);
        return [];
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    const flatBatchResults = batchResults.flat();
    allMorphs = [...allMorphs, ...flatBatchResults];
  }
  
  return allMorphs;
}

/**
 * Process morphing transactions to extract message data
 * @param {Array} transfers - Asset transfers
 * @returns {Promise<Array>} Processed morph operations
 */
async function processMorphData(transfers) {
  const morphOperations = [];
  
  let processedCount = 0;
  let messagesFoundCount = 0;
  let morphMessagesCount = 0;
  
  for (const transfer of transfers) {
    try {
      const hashId = transfer.assetTransferFullHash || transfer.fullHash || 'unknown';
      
      processedCount++;
      
      // Get the full transaction to check for message
      const response = await axios.get(ARDOR_API_URL, {
        params: {
          requestType: 'getTransaction',
          fullHash: hashId,
          includePrunable: true,
          chain: ARDOR_CHAIN_ID
        }
      });
      
      if (!response.data || response.data.errorCode) {
        continue;
      }
      
      // Check for prunable message
      if (!response.data.attachment) {
        continue;
      }
      
      if (!response.data.attachment.message) {
        continue;
      }
      
      messagesFoundCount++;
      
      try {
        const messageData = JSON.parse(response.data.attachment.message);
        
        // Check if this is a morph operation - looking for 'cardmorph' message property
        if (messageData.message === "cardmorph") {
          morphMessagesCount++;
          
          // Get asset info for the card
          const assetInfo = await getAssetInfo(transfer.assetId);
          if (!assetInfo) {
            continue;
          }
          
          // Construct morph operation record
          const morphOp = {
            id: hashId,
            timestamp: parseInt(transfer.timestamp),
            timestampISO: ardorTimestampToDate(parseInt(transfer.timestamp)),
            morpher: transfer.recipientRS,
            from_card: assetInfo.cardName,
            from_asset_id: transfer.assetId,
            to_card: assetInfo.cardName, // Same card ID but morphed version
            to_asset_id: transfer.assetId,
            message: messageData,
            raw: response.data
          };
          
          morphOperations.push(morphOp);
        }
      } catch (error) {
        console.error(`Error parsing message for transaction:`, error.message);
      }
    } catch (error) {
      console.error(`Error processing transfer:`, error.message);
    }
  }
  
  return morphOperations;
}

module.exports = {
  fetchMorphTransactions,
  processMorphData,
  getAssetInfo,
  ardorTimestampToDate
};
