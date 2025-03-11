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
  const BATCH_SIZE = 5;
  const uniqueAssetIds = [...new Set(assetIds)]; // Remove duplicates
  const transfers = [];
  const processedAssetIds = new Set();
  
  console.log(`Processing ${uniqueAssetIds.length} unique assets for morph transactions...`);
  
  // Process assets in batches
  for (let i = 0; i < uniqueAssetIds.length; i += BATCH_SIZE) {
    const batch = uniqueAssetIds.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(uniqueAssetIds.length/BATCH_SIZE)}, assets: ${batch.slice(0, 5).join(', ')}...`);
    
    // Process each asset in the batch with proper caching
    const batchPromises = batch.map(async (assetId) => {
      // Skip if already processed
      if (processedAssetIds.has(assetId)) {
        console.log(`Skipping already processed asset ${assetId}`);
        return [];
      }
      
      // Generate cache key for this asset's transfers
      const cacheKey = `asset_transfers_${assetId}`;
      
      // Check memory cache first (fast)
      const cachedTransfers = cacheService.transaction.get(cacheKey);
      if (cachedTransfers) {
        console.log(`Using cached transfers for asset ${assetId} (${cachedTransfers.length} transfers)`);
        processedAssetIds.add(assetId);
        return cachedTransfers;
      }
      
      // Try file cache next (slower but persistent)
      const fileCacheKey = `ardor_asset_transfers_${assetId}`;
      const fileCache = cacheService.file.read(fileCacheKey);
      if (fileCache && fileCache.transfers) {
        console.log(`Using file cache for asset ${assetId} (${fileCache.transfers.length} transfers)`);
        // Store in memory cache for faster access next time
        cacheService.transaction.set(cacheKey, fileCache.transfers, 3600); // 1 hour TTL
        processedAssetIds.add(assetId);
        return fileCache.transfers;
      }

      try {
        // Fetch transfers for this asset
        console.log(`Fetching transfers for asset ${assetId}...`);
        const response = await makeRetryableRequest({
          url: ARDOR_API_URL,
          params: {
            requestType: 'getAssetTransfers',
            asset: assetId,
            firstIndex: 0,
            lastIndex: 100
          },
          cacheTTL: 3600 // 1 hour
        });
        
        if (!response.data || !response.data.transfers) {
          console.log(`No transfers found for asset ${assetId}`);
          processedAssetIds.add(assetId);
          return [];
        }
        
        const assetTransfers = response.data.transfers.filter(transfer => 
          transfer.recipientRS === morphAccount
        );
        
        console.log(`Found ${assetTransfers.length} potential outgoing transfers for asset ${assetId}`);
        
        // Cache the result in both memory and file
        cacheService.transaction.set(cacheKey, assetTransfers, 3600);
        cacheService.file.write(fileCacheKey, { 
          transfers: assetTransfers,
          timestamp: new Date().toISOString(),
          assetId
        });
        
        processedAssetIds.add(assetId);
        return assetTransfers;
      } catch (error) {
        console.error(`Error fetching transfers for asset ${assetId}:`, error.message);
        processedAssetIds.add(assetId); // Mark as processed to avoid retries
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
  
  if (!transfers || transfers.length === 0) {
    console.log('No transfers to process for morphing operations');
    return morphOperations;
  }
  
  // Log sample transfer data to understand its structure better
  if (transfers.length > 0) {
    console.log(`Sample transfer object keys: ${Object.keys(transfers[0]).join(', ')}`);
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
      
      // Get the full transaction using our cache function
      const transactionData = await getTransactionWithCache(hashId);
      if (!transactionData) {
        continue;
      }
      
      // Log transaction keys only once
      if (processedCount === 1) {
        console.log(`Sample transaction object keys: ${Object.keys(transactionData).join(', ')}`);
        if (transactionData.attachment) {
          console.log(`Sample attachment keys: ${Object.keys(transactionData.attachment).join(', ')}`);
        }
      }
      
      // Check for attachment and message
      if (!transactionData.attachment || !transactionData.attachment.message) {
        continue;
      }
      
      messagesFoundCount++;
      
      // Get the raw message
      const rawMessage = transactionData.attachment.message;
      
      // Log a sample of raw messages (up to 10) to help with debugging
      if (messagesFoundCount <= 10) {
        console.log(`Sample message ${messagesFoundCount}: ${rawMessage}`);
      }
      
      try {
        // Pre-process the message
        const cleanedMessage = preprocessJsonMessage(rawMessage);
        
        // Try to parse the message as JSON
        let messageData;
        try {
          messageData = JSON.parse(cleanedMessage);
        } catch (jsonError) {
          // Check if it contains cardmorph keyword before giving up
          if (cleanedMessage.includes('cardmorph')) {
            potentialMorphMsgs++;
            console.log(`Found potential morph message (not valid JSON): ${cleanedMessage}`);
            messageData = { message: "cardmorph" };
          } else {
            throw jsonError;
          }
        }
        
        // Check if this is a morph operation through various patterns
        let isMorphOperation = false;
        
        // Direct pattern: {"submittedBy":"MBOmno","withdrawIndex":0,"message":"cardmorph"}
        if (messageData && messageData.message === "cardmorph") {
          isMorphOperation = true;
          console.log(`Found morph operation with direct pattern: ${JSON.stringify(messageData)}`);
        }
        // Alternative pattern: might have a contract field
        else if (messageData && messageData.contract === "cardmorph") {
          isMorphOperation = true;
          console.log(`Found morph operation with contract pattern: ${JSON.stringify(messageData)}`);
        }
        // Check raw message string as fallback
        else if (cleanedMessage.includes('cardmorph') && !cleanedMessage.includes('CardCraftGEM') && !cleanedMessage.includes('MBJackpot')) {
          potentialMorphMsgs++;
          console.log(`Found raw message containing cardmorph: ${cleanedMessage}`);
          messageData = { message: "cardmorph" };
          isMorphOperation = true;
        }
        
        if (isMorphOperation) {
          morphMessagesCount++;
          
          // Get asset info for the card
          const assetInfo = await getAssetInfo(transfer.assetId);
          if (!assetInfo) {
            continue;
          }
          
          // Get recipient information (the user who received the morphed card)
          const recipientRS = transfer.recipientRS || transactionData.recipientRS;
          
          // Construct morph operation record
          const morphOp = {
            id: hashId,
            timestamp: parseInt(transfer.timestamp),
            timestampISO: ardorTimestampToDate(parseInt(transfer.timestamp)),
            morpher: recipientRS,  // The recipient of the transaction is the morpher
            from_card: assetInfo.cardName,
            from_asset_id: transfer.assetId,
            to_card: assetInfo.cardName, // Same card ID but morphed version
            to_asset_id: transfer.assetId,
            message: messageData,
            submittedBy: messageData.submittedBy || "unknown",
            withdrawIndex: messageData.withdrawIndex || 0,
            direction: "outgoing"
          };
          
          morphOperations.push(morphOp);
        }
      } catch (error) {
        // Log more details about the message that failed to parse
        console.error(`Error parsing message for transaction ${hashId}:`, error.message);
        console.error(`Raw message excerpt: "${rawMessage.substring(0, 100)}..."`);
      }
    } catch (error) {
      console.error(`Error processing transfer:`, error.message);
    }
    
    // Add progress logging
    if (processedCount % 500 === 0) {
      console.log(`Processed ${processedCount}/${transfers.length} transfers, found ${morphMessagesCount} morph operations so far...`);
      // Log cache efficiency stats
      console.log(`Cache status: ${transactionCache.size} transactions cached`);
    }
  }
  
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
    cleaned = cleaned.slice(1);
  }
  
  // Check for common issues with message formatting
  
  // 1. Handle messages that have HTML entities
  cleaned = cleaned.replace(/&quot;/g, '"');
  
  // 2. If message starts with quotes but isn't properly JSON formatted, try to fix
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    try {
      // This might be a double-encoded JSON string
      cleaned = JSON.parse(cleaned);
    } catch (e) {
      // Failed to parse as double-encoded JSON, leave as is
    }
  }
  
  // 3. Try to fix common JSON formatting issues
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    // Look for first '{' character
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace > 0) {
      cleaned = cleaned.substring(firstBrace);
    }
  }
  
  // 4. Fix trailing characters after valid JSON (which can happen in prunable messages)
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace > 0 && lastBrace < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastBrace + 1);
  }
  
  // 5. Try to identify the exact pattern for morph operations
  if (cleaned.includes('submittedBy') && cleaned.includes('cardmorph')) {
    console.log('Found message with submittedBy and cardmorph keywords:', cleaned);
    // This is likely a morph operation based on the specified format
  }
  
  return cleaned;
}

module.exports = {
  fetchMorphTransactions,
  processMorphData,
  getAssetInfo,
  ardorTimestampToDate,
  getTransactionWithCache // Export the new cached function
};
