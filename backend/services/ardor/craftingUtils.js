/**
 * Ardor Crafting Utilities
 * Helper functions for interacting with the Ardor blockchain for crafting operations
 */
const axios = require('axios');
const { ARDOR_API_URL, ARDOR_CHAIN_ID, ARDOR_NODE, REGULAR_CARDS_ISSUER } = require('../../config');

// Constants
const DEBUG = true;
const GEM_ASSET_ID = '10230963490193589789';
const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();
const CRAFT_ACCOUNT = REGULAR_CARDS_ISSUER; // "ARDOR-4V3B-TVQA-Q6LF-GMH3T"

// Logger implementation
const logger = {
  debug: (msg) => DEBUG && console.log(`[CRAFT-DEBUG] ${msg}`),
  info: (msg) => console.log(`[CRAFT] ${msg}`),
  error: (msg, err = null) => {
    console.error(`[CRAFT-ERROR] ${msg}`);
    if (err) console.error(err);
  }
};

/**
 * Makes an API call to Ardor blockchain
 * @param {Object} params - API parameters
 * @returns {Object} Response data
 */
async function callArdorAPI(params) {
  try {
    if (!params.chain && params.requestType !== 'getAsset') {
      params.chain = ARDOR_CHAIN_ID;
    }
    
    logger.debug(`API Request: ${JSON.stringify(params)}`);
    const response = await axios.get(ARDOR_API_URL, { params });
    
    if (!response.data) {
      logger.debug('Empty response from API');
      return null;
    }
    
    if (response.data.errorCode || response.data.errorDescription) {
      logger.debug(`API error: ${response.data.errorDescription || response.data.errorCode}`);
      return null;
    }
    
    return response.data;
  } catch (error) {
    logger.error(`API request failed: ${JSON.stringify(params)}`, error);
    return null;
  }
}

/**
 * Get transaction with prunable message
 * @param {string} fullHash - Transaction full hash
 * @returns {Object} Transaction data with message
 */
async function getTransactionWithPrunable(fullHash) {
  logger.debug(`Getting transaction with prunable message: ${fullHash}`);
  
  // Try with includePrunable first
  const txResponse = await callArdorAPI({
    requestType: 'getTransaction',
    fullHash: fullHash,
    includePrunable: true,
    chain: ARDOR_CHAIN_ID
  });
  
  if (txResponse && txResponse.attachment && txResponse.attachment.message) {
    logger.debug(`Found message directly in transaction ${fullHash}`);
    return txResponse;
  }
  
  // Try getPrunableMessage as fallback
  const prunableResponse = await callArdorAPI({
    requestType: 'getPrunableMessage',
    transaction: fullHash,
    chain: ARDOR_CHAIN_ID
  });
  
  if (prunableResponse && prunableResponse.message) {
    logger.debug(`Found message via getPrunableMessage for ${fullHash}`);
    const basicTxResponse = await callArdorAPI({
      requestType: 'getTransaction',
      fullHash: fullHash,
      chain: ARDOR_CHAIN_ID
    });
    
    if (basicTxResponse) {
      basicTxResponse.attachment = basicTxResponse.attachment || {};
      basicTxResponse.attachment.message = prunableResponse.message;
      basicTxResponse.attachment.messageIsText = prunableResponse.messageIsText;
      return basicTxResponse;
    }
  }
  
  // Try one more time without includePrunable
  const fallbackResponse = await callArdorAPI({
    requestType: 'getTransaction',
    fullHash: fullHash,
    chain: ARDOR_CHAIN_ID
  });
  
  if (fallbackResponse && fallbackResponse.attachment && fallbackResponse.attachment.message) {
    logger.debug(`Found message in fallback transaction request for ${fullHash}`);
    return fallbackResponse;
  }
  
  logger.debug(`No prunable message found for transaction ${fullHash}`);
  return txResponse || fallbackResponse;
}

/**
 * Extract craft operation details from transaction
 * @param {Object} transaction - Transaction data
 * @returns {Object|null} Craft details or null if not a craft operation
 */
function extractCraftDetails(transaction) {
  if (!transaction || !transaction.attachment || !transaction.attachment.message) {
    return null;
  }
  
  try {
    const message = transaction.attachment.message;
    const messageData = JSON.parse(message);
    
    if (messageData.submittedBy === "CardCraftGEM" || messageData.submittedBy === "CardCraft") {
      const cardsUsed = messageData.transactionSpent && Array.isArray(messageData.transactionSpent) 
        ? messageData.transactionSpent.length 
        : 1;
      
      return {
        isCraftOperation: true,
        submittedBy: messageData.submittedBy,
        cardsUsed: cardsUsed,
        amountNQTReceived: messageData.amountNQTReceived,
        amountNQTSpent: messageData.amountNQTSpent,
        transactionTrigger: messageData.transactionTrigger,
        transactionSpent: messageData.transactionSpent,
        serialForRandom: messageData.serialForRandom
      };
    }
  } catch (error) {
    logger.debug(`Failed to parse message as JSON: ${error.message}`);
  }
  
  return null;
}

/**
 * Get asset information
 * @param {string} assetId - Asset ID
 * @returns {Object|null} Asset information or null if not found
 */
async function getAssetInfo(assetId) {
  const assetData = await callArdorAPI({
    requestType: 'getAsset',
    asset: assetId
  });
  
  if (!assetData) {
    logger.debug(`Failed to get info for asset ${assetId}`);
    return null;
  }
  
  let cardName = assetData.name || `Asset ${assetId}`;
  let cardRarity = "unknown";
  let cardType = "unknown";
  
  if (assetData.description) {
    try {
      const descriptionData = JSON.parse(assetData.description);
      if (descriptionData.name) cardName = descriptionData.name;
      if (descriptionData.rarity) cardRarity = descriptionData.rarity;
      if (descriptionData.type) cardType = descriptionData.type;
    } catch (error) {
      try {
        const nameMatch = assetData.description.match(/"name"\s*:\s*"([^"]+)"/);
        if (nameMatch && nameMatch[1]) cardName = nameMatch[1];
        const rarityMatch = assetData.description.match(/"rarity"\s*:\s*"([^"]+)"/);
        if (rarityMatch && rarityMatch[1]) cardRarity = rarityMatch[1];
        const typeMatch = assetData.description.match(/"type"\s*:\s*"([^"]+)"/);
        if (typeMatch && typeMatch[1]) cardType = typeMatch[1];
      } catch (regexErr) {
        logger.debug(`Failed to extract metadata with regex: ${regexErr.message}`);
      }
    }
  }
  
  return {
    assetId,
    name: assetData.name,
    description: assetData.description,
    cardName,
    cardRarity,
    cardType,
    quantity: assetData.quantityQNT,
    decimals: assetData.decimals
  };
}

/**
 * Get a batch of asset transfers
 * @param {number} firstIndex - First index for pagination
 * @param {number} lastIndex - Last index for pagination
 * @returns {Array} Asset transfers
 */
async function getAssetTransfersBatch(firstIndex, lastIndex) {
  const params = {
    requestType: 'getAssetTransfers',
    account: CRAFT_ACCOUNT,
    chain: ARDOR_CHAIN_ID,
    firstIndex,
    lastIndex
  };
  
  const response = await callArdorAPI(params);
  
  if (!response || !response.transfers) {
    return [];
  }
  
  // Filter out GEM token transfers
  const filteredTransfers = response.transfers.filter(transfer => transfer.asset !== GEM_ASSET_ID);
  return filteredTransfers;
}

/**
 * Normalize a timestamp to a standard format
 * @param {string|number} timestamp - The timestamp to normalize
 * @returns {number} Normalized timestamp
 */
function normalizeTimestamp(timestamp) {
  const ts = Number(timestamp);
  return ts > 1e10 ? Math.floor(ts / 1000) : ts;
}

/**
 * Convert Ardor timestamp to JavaScript Date
 * @param {number} timestamp - Ardor timestamp (seconds since Ardor epoch)
 * @returns {Date} JavaScript Date object
 */
function ardorTimestampToDate(timestamp) {
  return new Date(ARDOR_EPOCH + (timestamp * 1000));
}

/**
 * Format Ardor timestamp to ISO string
 * @param {number} timestamp - Ardor timestamp (seconds since Ardor epoch)
 * @returns {string} ISO date string
 */
function ardorTimestampToISOString(timestamp) {
  return ardorTimestampToDate(timestamp).toISOString();
}

/**
 * Get ISO timestamp from Ardor timestamp
 * @param {number} timestamp - Ardor timestamp (seconds since Ardor epoch)
 * @returns {string|null} ISO date string or null if timestamp is invalid
 */
function getTimestampISO(timestamp) {
  if (!timestamp) return null;
  return ardorTimestampToDate(timestamp).toISOString();
}

/**
 * Process a transfer to extract craft operation
 * @param {Object} transfer - Transfer data
 * @param {Object} assetInfoCache - Cache of asset information
 * @returns {Object|null} Craft operation or null if not a craft operation
 */
async function processTransfer(transfer, assetInfoCache) {
  const fullHash = transfer.assetTransferFullHash || transfer.fullHash;
  const assetId = transfer.asset;
  
  // Skip GEM token transfers
  if (assetId === GEM_ASSET_ID) {
    return null;
  }
  
  if (!fullHash) {
    return null;
  }
  
  if (transfer.senderRS !== CRAFT_ACCOUNT) {
    return null;
  }
  
  const transaction = await getTransactionWithPrunable(fullHash);
  if (!transaction) {
    return null;
  }
  
  const craftDetails = extractCraftDetails(transaction);
  if (!craftDetails) {
    return null;
  }
  
  if (!assetInfoCache[assetId]) {
    assetInfoCache[assetId] = await getAssetInfo(assetId);
  }
  
  const assetInfo = assetInfoCache[assetId] || {
    assetId,
    name: `Asset ${assetId}`,
    cardName: `Unknown (${assetId})`,
    cardRarity: 'unknown',
    cardType: 'unknown'
  };
  
  const normalizedTimestamp = normalizeTimestamp(transfer.timestamp);
  
  return {
    id: fullHash,
    timestamp: normalizedTimestamp,
    date: ardorTimestampToDate(normalizedTimestamp).toISOString(),
    timestampISO: ardorTimestampToDate(normalizedTimestamp).toISOString(),
    recipient: transfer.recipientRS,
    assetId,
    assetName: assetInfo.name,
    cardName: assetInfo.cardName,
    cardRarity: assetInfo.cardRarity,
    cardType: assetInfo.cardType,
    cardsUsed: craftDetails.cardsUsed,
    fullHash,
    details: craftDetails
  };
}

module.exports = {
  callArdorAPI,
  getTransactionWithPrunable,
  extractCraftDetails,
  getAssetInfo,
  getAssetTransfersBatch,
  processTransfer,
  normalizeTimestamp,
  ardorTimestampToDate,
  ardorTimestampToISOString,
  getTimestampISO,
  GEM_ASSET_ID,
  ARDOR_EPOCH,
  CRAFT_ACCOUNT
};
