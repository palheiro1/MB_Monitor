const axios = require('axios');
const { ARDOR_API_URL, ARDOR_CHAIN_ID } = require('../../config');
const { makeRetryableRequest } = require('../../utils/apiUtils');
const cacheService = require('../../services/cacheService');

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
 * Transaction cache to prevent duplicate API calls
 */
const transactionCache = new Map();

/**
 * Asset transfer cache to avoid duplicate requests
 */
const transferBatchCache = new Map();

/**
 * Get transaction with caching
 * @param {string} hashId - Transaction hash ID
 * @returns {Promise<Object>} Transaction data
 */
async function getTransactionWithCache(hashId) {
  // Check cache first before making API call
  if (transactionCache.has(hashId)) {
    return transactionCache.get(hashId);
  }
  
  // Make API request if not in cache
  try {
    const response = await makeRetryableRequest({
      url: ARDOR_API_URL,
      params: {
        requestType: 'getTransaction',
        fullHash: hashId,
        includePrunable: true,
        chain: ARDOR_CHAIN_ID
      }
    });
    
    if (!response.data || response.data.errorCode) {
      return null;
    }
    
    // Store in cache
    transactionCache.set(hashId, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error fetching transaction ${hashId}:`, error.message);
    return null;
  }
}

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
    // Use retryable request for asset info too
    const response = await makeRetryableRequest({
      url: ARDOR_API_URL,
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
 * @param {string} morphAccount - Morph account ID
 * @returns {Promise<Array>} Asset transfers
 */
async function fetchMorphTransactions(assetIds, morphAccount) {
  // Create a more efficient batching system 
  const BATCH_SIZE = 10; // Increased batch size
  const MAX_ASSETS_TO_CHECK = 100; // Limit number of assets to check
  const uniqueAssetIds = [...new Set(assetIds)].slice(0, MAX_ASSETS_TO_CHECK); // Limit assets
  const transfers = [];
  const processedAssetIds = new Set();
  
  console.log(`Processing ${uniqueAssetIds.length} unique assets for morph transactions (limited from ${assetIds.length})...`);
  
  // Process assets in batches
  for (let i = 0; i < uniqueAssetIds.length; i += BATCH_SIZE) {
    const batch = uniqueAssetIds.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(uniqueAssetIds.length/BATCH_SIZE)}`);
    
    // Process each asset in the batch with proper caching
    const batchPromises = batch.map(async (assetId) => {
      // Skip if already processed
      if (processedAssetIds.has(assetId)) {
        return [];
      }
      
      // Generate cache key for this asset's transfers - ONLY use memory cache, not file cache
      const cacheKey = `asset_transfers_${assetId}`;
      
      // Check memory cache first (fast)
      const cachedTransfers = cacheService.transaction.get(cacheKey);
      if (cachedTransfers) {
        processedAssetIds.add(assetId);
        return cachedTransfers;
      }

      try {
        // Fetch transfers for this asset
        const response = await makeRetryableRequest({
          url: ARDOR_API_URL,
          params: {
            requestType: 'getAssetTransfers',
            asset: assetId,
            firstIndex: 0,
            lastIndex: 500  // Increased from 100 to 500 to get more historical data
          },
          cacheTTL: 3600
        });
        
        if (!response.data || !response.data.transfers) {
          processedAssetIds.add(assetId);
          return [];
        }
        
        // Only filter by morph account if one was provided
        let assetTransfers = response.data.transfers;
        if (morphAccount) {
          assetTransfers = assetTransfers.filter(transfer => 
            transfer.recipientRS === morphAccount
          );
        }
        
        if (assetTransfers.length > 0) {
          console.log(`Found ${assetTransfers.length} transfers for asset ${assetId}`);
          
          // For each transfer, immediately get and attach transaction data
          for (const transfer of assetTransfers) {
            try {
              // Use assetTransferFullHash to retrieve the full transaction
              if (transfer.assetTransferFullHash) {
                const txData = await getTransactionWithCache(transfer.assetTransferFullHash);
                if (txData) {
                  // Attach the full transaction data to the transfer object
                  transfer.transactionData = txData;
                  // Save the asset ID explicitly for easy access
                  transfer.asset = assetId;
                }
              }
            } catch (txError) {
              console.error(`Error fetching transaction data for transfer: ${txError.message}`);
            }
          }
          
          // Cache in memory only - REMOVED individual file caching
          cacheService.transaction.set(cacheKey, assetTransfers, 3600);
        }
        
        processedAssetIds.add(assetId);
        return assetTransfers;
      } catch (error) {
        console.error(`Error fetching transfers for asset ${assetId}:`, error.message);
        processedAssetIds.add(assetId);
        return [];
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    transfers.push(...batchResults.flat());
  }
  
  console.log(`Total potential morph transfers found: ${transfers.length}`);
  return transfers;
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
  
  // Add tracking for total quantity of cards morphed
  let totalCardsFound = 0;
  let operationsWithQuantity = 0;
  let operationsWithoutQuantity = 0;
  
  if (!transfers || transfers.length === 0) {
    console.log('No transfers to process for morphing operations');
    return morphOperations;
  }
  
  // Log sample transfer data to understand its structure better
  if (transfers.length > 0) {
    console.log(`Sample transfer object keys: ${Object.keys(transfers[0]).join(', ')}`);
    console.log(`Sample transfer data (first item): ${JSON.stringify(transfers[0]).substring(0, 200)}...`);
  }
  
  // Add a counter for potential morph messages found
  let potentialMorphMsgs = 0;
  console.log(`Starting to process ${transfers.length} transfers to find morph operations`);
  
  // Create a Set to track processed transactions and avoid duplicates
  const processedTransactions = new Set();
  
  for (const transfer of transfers) {
    try {
      const hashId = transfer.assetTransferFullHash || transfer.fullHash || 'unknown';
      
      // Skip if we've already processed this transaction
      if (processedTransactions.has(hashId)) {
        continue;
      }
      processedTransactions.add(hashId);
      
      processedCount++;
      
      // Debug log to see what's in the transfer
      if (processedCount === 1) {
        console.log(`DEBUG - TRANSFER EXAMPLE: ${JSON.stringify(transfer).substring(0, 300)}`);
      }
      
      // Get transaction data - either from the attached data or by fetching it
      let transactionData = transfer.transactionData;
      if (!transactionData) {
        transactionData = await getTransactionWithCache(hashId);
      }
      
      if (!transactionData) {
        console.log(`Could not get transaction data for ${hashId}`);
        continue;
      }
      
      // Check for attachment with message
      if (!transactionData.attachment || !transactionData.attachment.message) {
        continue;
      }
      
      messagesFoundCount++;
      
      // Get the raw message
      const rawMessage = transactionData.attachment.message;
      
      try {
        // Pre-process the message
        const cleanedMessage = preprocessJsonMessage(rawMessage);
        
        // Debug log for early messages
        if (messagesFoundCount <= 5) {
          console.log(`Sample message #${messagesFoundCount}: ${cleanedMessage}`);
        }
        
        // Try to parse the message as JSON
        let messageData;
        try {
          messageData = JSON.parse(cleanedMessage);
        } catch (jsonError) {
          // Check if it contains cardmorph keyword
          if (cleanedMessage.includes('cardmorph')) {
            potentialMorphMsgs++;
            console.log(`Found potential morph message (not valid JSON): ${cleanedMessage}`);
            messageData = { message: "cardmorph" };
          } else {
            continue;
          }
        }
        
        // Detect morph operations by examining message content
        let isMorphOperation = false;
        
        // Check all the patterns that indicate a morph operation
        if (messageData) {
          // Pattern 1: Direct message field
          if (messageData.message === "cardmorph") {
            isMorphOperation = true;
          }
          // Pattern 2: Contract field
          else if (messageData.contract === "cardmorph") {
            isMorphOperation = true;
          }
          // Pattern 3: Standard morph operation format
          else if (typeof messageData.submittedBy === 'string' && 
                   (typeof messageData.withdrawIndex === 'number' || 
                    typeof messageData.withdrawIndex === 'string')) {
            isMorphOperation = true;
          }
          // Pattern 4: Raw message contains cardmorph keyword
          else if (cleanedMessage.includes('cardmorph') && 
                  !cleanedMessage.includes('CardCraftGEM') && 
                  !cleanedMessage.includes('MBJackpot')) {
            isMorphOperation = true;
          }
        }
        
        if (isMorphOperation) {
          morphMessagesCount++;
          
          // Critical: Get the asset ID from the correct location
          // First check the transaction attachment
          const assetId = transactionData.attachment.asset || 
                         transfer.asset ||  // From our added asset property
                         transfer.assetId;  // Fallback
          
          if (!assetId) {
            console.log(`Missing asset ID in morph transaction ${hashId}`);
            continue;
          }
          
          // Get asset info for the card
          const assetInfo = await getAssetInfo(assetId);
          if (!assetInfo) {
            console.log(`Failed to get asset info for asset ID ${assetId}, skipping morph operation`);
            continue;
          }
          
          // Get recipient information
          const recipientRS = transfer.recipientRS || transactionData.recipientRS;
          
          // Extract quantity information with priority order
          let morphQuantity = 1; // Default to 1 if nothing else found
          
          // First priority: transaction attachment quantityQNT
          if (transactionData.attachment && transactionData.attachment.quantityQNT) {
            morphQuantity = parseInt(transactionData.attachment.quantityQNT, 10);
            console.log(`Found quantity in transaction attachment: ${morphQuantity}`);
          } 
          // Second priority: transfer quantityQNT
          else if (transfer.quantityQNT) {
            morphQuantity = parseInt(transfer.quantityQNT, 10);
          }
          
          // Validate the quantity
          if (isNaN(morphQuantity) || morphQuantity < 1) {
            morphQuantity = 1;
          }
          
          // Track statistics and construct the morph operation
          totalCardsFound += morphQuantity;
          if (morphQuantity > 1) {
            operationsWithQuantity++;
          } else {
            operationsWithoutQuantity++;
          }
          
          const morphOp = {
            id: hashId,
            timestamp: parseInt(transfer.timestamp),
            timestampISO: ardorTimestampToDate(parseInt(transfer.timestamp)),
            morpher: recipientRS,
            from_card: assetInfo.cardName,
            from_asset_id: assetId,
            to_card: assetInfo.cardName,
            to_asset_id: assetId,
            message: messageData,
            submittedBy: messageData.submittedBy || "unknown",
            withdrawIndex: messageData.withdrawIndex || 0,
            direction: "outgoing",
            quantity: morphQuantity
          };
          
          morphOperations.push(morphOp);
          console.log(`Added morph operation: ${hashId} for ${assetInfo.cardName} (quantity: ${morphQuantity})`);
        }
      } catch (error) {
        console.error(`Error processing message for ${hashId}:`, error.message);
      }
    } catch (error) {
      console.error(`Error processing transfer:`, error.message);
    }
    
    // Progress logging
    if (processedCount % 100 === 0) {
      console.log(`Processed ${processedCount}/${transfers.length} transfers, found ${morphOperations.length} morph operations so far...`);
    }
  }
  
  // Add summary logging of quantities
  const totalQuantity = morphOperations.reduce((sum, op) => sum + (op.quantity || 1), 0);
  console.log(`MORPH PROCESSING COMPLETE:`);
  console.log(`- Found ${morphOperations.length} morph operations`);
  console.log(`- Total cards morphed: ${totalQuantity}`);
  console.log(`- Operations with quantity > 1: ${operationsWithQuantity}`);
  console.log(`- Operations with quantity = 1: ${operationsWithoutQuantity}`);
  console.log(`- Average cards per operation: ${(totalQuantity / morphOperations.length).toFixed(2)}`);
  
  console.log(`Processing complete: ${processedCount} transfers, found ${messagesFoundCount} messages, ` +
              `identified ${morphMessagesCount} morph operations`);
  console.log(`Found ${potentialMorphMsgs} messages containing "cardmorph" keyword`);
  console.log(`Cache efficiency: ${transactionCache.size} unique transactions cached out of ${processedCount} processed`);
  
  return morphOperations;
}

/**
 * Pre-process a message string to help with JSON parsing
 * @param {string} message - Raw message string
 * @returns {string} Cleaned message ready for JSON parsing
 */
function preprocessJsonMessage(message) {
  if (!message || typeof message !== 'string') {
    return message;
  }
  
  // Trim whitespace
  let cleaned = message.trim();
  
  // Remove BOM if present
  if (cleaned.charCodeAt(0) === 0xFEFF) {
    cleaned = cleaned.substring(1);
  }
  
  // Handle cases where message might have incorrect JSON formatting
  if (cleaned.includes('cardmorph') && !cleaned.startsWith('{')) {
    // Attempt to extract JSON-like content
    const jsonStartIdx = cleaned.indexOf('{');
    if (jsonStartIdx >= 0) {
      cleaned = cleaned.substring(jsonStartIdx);
    } else {
      // If no JSON structure, create a simple one
      cleaned = '{"message":"cardmorph"}';
    }
  }
  
  return cleaned;
}

// Properly export all required functions
module.exports = {
  fetchMorphTransactions,
  processMorphData,
  getAssetInfo,
  ardorTimestampToDate,
  getTransactionWithCache,
  preprocessJsonMessage
};
