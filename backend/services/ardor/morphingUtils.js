const axios = require('axios');
const { ARDOR_API_URL, ARDOR_CHAIN_ID } = require('../../config');
const { makeRetryableRequest } = require('../../utils/apiUtils');

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
  let allMorphs = [];
  const batchSize = 10; // Process in small batches to avoid overwhelming the API
  
  console.log(`Fetching morph transactions FROM account: ${morphAccount}`);
  
  // Safety check: ensure assetIds is an array and contains valid items
  if (!Array.isArray(assetIds)) {
    console.error('Asset IDs must be an array:', typeof assetIds);
    return [];
  }
  
  // Normalize asset IDs to ensure they are all valid strings
  const validAssetIds = assetIds.filter(id => {
    if (!id) {
      return false;
    }
    // Handle both string asset IDs and objects that contain asset ID
    if (typeof id === 'object' && id.asset) {
      return true;
    }
    return typeof id === 'string' || typeof id === 'number';
  }).map(id => {
    // Extract asset ID from object if needed
    if (typeof id === 'object' && id.asset) {
      return id.asset.toString();
    }
    return id.toString();
  });
  
  console.log(`Processing ${validAssetIds.length} valid asset IDs out of ${assetIds.length} provided`);
  
  if (validAssetIds.length === 0) {
    console.warn('No valid asset IDs to process after filtering');
    return [];
  }
  
  for (let i = 0; i < validAssetIds.length; i += batchSize) {
    const batchAssetIds = validAssetIds.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(validAssetIds.length/batchSize)}, assets: ${batchAssetIds.join(', ').substring(0, 100)}...`);
    
    const batchPromises = batchAssetIds.map(async (assetId) => {
      try {
        // Use the retryable request helper instead of axios directly
        const senderResponse = await makeRetryableRequest({
          url: ARDOR_API_URL,
          params: {
            requestType: 'getAssetTransfers',
            asset: assetId,
            account: morphAccount,  // Transfers FROM the morph account
            chain: ARDOR_CHAIN_ID,
            firstIndex: 0,
            lastIndex: 100
          }
        });
        
        let assetTransfers = [];
        
        // Process sender transfers
        if (senderResponse.data && senderResponse.data.transfers && Array.isArray(senderResponse.data.transfers)) {
          const transfers = senderResponse.data.transfers.map(transfer => ({
            ...transfer,
            assetId,
            direction: 'outgoing'
          }));
          assetTransfers = [...assetTransfers, ...transfers];
        }
        
        console.log(`Found ${assetTransfers.length} potential outgoing transfers for asset ${assetId}`);
        return assetTransfers;
      } catch (error) {
        console.error(`Error fetching transfers for asset ${assetId}:`, error.message);
        return [];
      }
    });
    
    try {
      const batchResults = await Promise.all(batchPromises);
      const flatBatchResults = batchResults.flat();
      allMorphs = [...allMorphs, ...flatBatchResults];
    } catch (error) {
      console.error('Error processing batch:', error.message);
      // Continue with the next batch even if this one failed
    }
  }
  
  console.log(`Total potential morph transfers found: ${allMorphs.length}`);
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
  
  for (const transfer of transfers) {
    try {
      const hashId = transfer.assetTransferFullHash || transfer.fullHash || 'unknown';
      
      processedCount++;
      
      // Get the full transaction to check for message using retryable request
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
        continue;
      }
      
      // Log transaction keys only once
      if (processedCount === 1) {
        console.log(`Sample transaction object keys: ${Object.keys(response.data).join(', ')}`);
        if (response.data.attachment) {
          console.log(`Sample attachment keys: ${Object.keys(response.data.attachment).join(', ')}`);
        }
      }
      
      // Check for attachment and message
      if (!response.data.attachment || !response.data.attachment.message) {
        continue;
      }
      
      messagesFoundCount++;
      
      // Get the raw message
      const rawMessage = response.data.attachment.message;
      
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
          const recipientRS = transfer.recipientRS || response.data.recipientRS;
          
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
    }
  }
  
  console.log(`Processing complete: ${processedCount} transfers, found ${messagesFoundCount} messages, ` +
              `identified ${morphMessagesCount} morph operations`);
  console.log(`Found ${potentialMorphMsgs} messages containing "cardmorph" keyword`);
  
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
  ardorTimestampToDate
};
