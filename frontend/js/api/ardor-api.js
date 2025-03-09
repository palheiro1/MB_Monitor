/**
 * Ardor API Client
 * 
 * This module provides an interface to interact with the Ardor blockchain API.
 * Based on documentation at https://ardordocs.jelurida.com/API
 * 
 * It handles communication with the local Ardor node at http://localhost:27876
 * and provides methods for retrieving blockchain data relevant to Mythical Beings.
 */

import { API_CONFIG } from '../config.js';

// Default Ardor configuration
const defaultConfig = API_CONFIG.ARDOR;

/**
 * ArdorAPI class for making requests to the Ardor blockchain
 */
export class ArdorAPI {
  /**
   * Initialize the ArdorAPI client
   * @param {Object} config - Optional configuration to override defaults
   */
  constructor(config = {}) {
    this.config = { ...defaultConfig, ...config };
    this.baseUrl = `${this.config.NODE_URL}${this.config.API_PATH}`;
  }
  
  /**
   * Make a request to the Ardor API
   * @param {string} requestType - The API request type
   * @param {Object} params - Additional parameters for the request
   * @returns {Promise} Promise resolving to the API response
   */
  async makeRequest(requestType, params = {}) {
    // Build the request URL with parameters
    const url = new URL(this.baseUrl);
    
    // Add standard parameters
    const requestParams = {
      requestType,
      chainId: this.config.CHAIN_ID,
      ...params
    };
    
    // Add all parameters to the URL
    Object.keys(requestParams).forEach(key => {
      url.searchParams.append(key, requestParams[key]);
    });
    
    // Implement retry logic
    let retries = 0;
    let lastError = null;
    
    while (retries <= this.config.MAX_RETRIES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.REQUEST_TIMEOUT);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Ardor API error (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        
        // Check if the response contains an error from Ardor
        if (data.errorCode || data.errorDescription) {
          throw new Error(`Ardor API error ${data.errorCode}: ${data.errorDescription}`);
        }
        
        return data;
      } catch (error) {
        lastError = error;
        retries++;
        
        if (error.name === 'AbortError') {
          console.warn(`Ardor API request timed out: ${requestType}`);
        } else {
          console.warn(`Ardor API request failed (attempt ${retries}/${this.config.MAX_RETRIES}):`, error);
        }
        
        if (retries <= this.config.MAX_RETRIES) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, this.config.RETRY_DELAY));
        }
      }
    }
    
    throw lastError || new Error(`Failed after ${this.config.MAX_RETRIES} retries`);
  }
  
  /**
   * Get general blockchain information
   * @returns {Promise} Promise resolving to blockchain info
   */
  async getBlockchainStatus() {
    return this.makeRequest('getBlockchainStatus');
  }
  
  /**
   * Get account information by account ID
   * @param {string} account - Ardor account ID
   * @returns {Promise} Promise resolving to account data
   */
  async getAccount(account) {
    return this.makeRequest('getAccount', { account });
  }
  
  /**
   * Get transactions for an account
   * @param {string} account - Ardor account ID
   * @param {Object} options - Additional options like firstIndex, lastIndex
   * @returns {Promise} Promise resolving to transactions data
   */
  async getAccountTransactions(account, options = {}) {
    return this.makeRequest('getBlockchainTransactions', { 
      account,
      type: options.type,
      subtype: options.subtype,
      firstIndex: options.firstIndex || 0,
      lastIndex: options.lastIndex || 20,
      includeIndirect: true,
      ...options
    });
  }
  
  /**
   * Get asset trades for an account or asset
   * @param {Object} params - Parameters like account, asset, firstIndex, lastIndex
   * @returns {Promise} Promise resolving to asset trades
   */
  async getTrades(params = {}) {
    return this.makeRequest('getTrades', {
      firstIndex: params.firstIndex || 0,
      lastIndex: params.lastIndex || 100,
      includeAssetInfo: true,
      ...params
    });
  }
  
  /**
   * Get specific transaction by ID
   * @param {string} transaction - Transaction ID
   * @param {boolean} includeChildTransactions - Whether to include child transactions
   * @returns {Promise} Promise resolving to transaction data
   */
  async getTransaction(transaction, includeChildTransactions = true) {
    return this.makeRequest('getTransaction', { 
      transaction,
      includeChildTransactions
    });
  }
  
  /**
   * Get Ardor block at given height
   * @param {number} height - Block height
   * @returns {Promise} Promise resolving to block data
   */
  async getBlockAtHeight(height) {
    return this.makeRequest('getBlockByHeight', { height });
  }
  
  /**
   * Get asset information by asset ID
   * @param {string} asset - Asset ID
   * @param {boolean} includeDetails - Whether to include asset details
   * @returns {Promise} Promise resolving to asset info
   */
  async getAsset(asset, includeDetails = true) {
    return this.makeRequest('getAsset', { 
      asset,
      includeCounts: includeDetails
    });
  }
  
  /**
   * Search for assets by name or description
   * @param {string} query - Search query
   * @param {number} firstIndex - Pagination first index
   * @param {number} lastIndex - Pagination last index
   * @returns {Promise} Promise resolving to matching assets
   */
  async searchAssets(query, firstIndex = 0, lastIndex = 20) {
    return this.makeRequest('searchAssets', {
      query,
      firstIndex,
      lastIndex
    });
  }
  
  /**
   * Get all assets owned by an account
   * @param {string} account - Ardor account ID
   * @param {number} firstIndex - Pagination first index
   * @param {number} lastIndex - Pagination last index
   * @returns {Promise} Promise resolving to account assets
   */
  async getAccountAssets(account, firstIndex = 0, lastIndex = 100) {
    return this.makeRequest('getAccountAssets', {
      account,
      firstIndex,
      lastIndex,
      includeAssetInfo: true
    });
  }
  
  /**
   * Get all assets issued by an account
   * @param {string} account - Ardor account ID
   * @param {number} firstIndex - Pagination first index
   * @param {number} lastIndex - Pagination last index
   * @returns {Promise} Promise resolving to issued assets
   */
  async getAccountIssuedAssets(account, firstIndex = 0, lastIndex = 100) {
    return this.makeRequest('getAssetsByIssuer', {
      account,
      firstIndex,
      lastIndex,
      includeCounts: true
    });
  }
  
  /**
   * Get recent trades for a specific asset
   * @param {string} asset - Asset ID
   * @param {number} firstIndex - Pagination first index
   * @param {number} lastIndex - Pagination last index
   * @returns {Promise} Promise resolving to asset trades
   */
  async getAssetTrades(asset, firstIndex = 0, lastIndex = 50) {
    return this.makeRequest('getTrades', {
      asset,
      firstIndex,
      lastIndex,
      includeAssetInfo: true
    });
  }
  
  /**
   * Get open orders for a specific asset
   * @param {string} asset - Asset ID
   * @param {number} firstIndex - Pagination first index
   * @param {number} lastIndex - Pagination last index
   * @returns {Promise} Promise resolving to open orders
   */
  async getOpenOrders(asset, firstIndex = 0, lastIndex = 100) {
    return this.makeRequest('getOrdersByAsset', {
      asset,
      firstIndex,
      lastIndex
    });
  }
  
  /**
   * Get orders for a specific account
   * @param {string} account - Account ID
   * @param {boolean} showOnlyOpenOrders - Whether to show only open orders
   * @returns {Promise} Promise resolving to account orders
   */
  async getAccountOrders(account, showOnlyOpenOrders = true) {
    return this.makeRequest('getAccountCurrentAskOrders', {
      account,
      firstIndex: 0,
      lastIndex: 100
    }).then(async askOrders => {
      const bidOrders = await this.makeRequest('getAccountCurrentBidOrders', {
        account,
        firstIndex: 0,
        lastIndex: 100
      });
      
      return {
        askOrders: askOrders.askOrders || [],
        bidOrders: bidOrders.bidOrders || []
      };
    });
  }
  
  /**
   * Get a specific Mythical Beings asset by its property
   * @param {string} property - Property to search by (e.g., 'name', 'description')
   * @param {string} value - Value to search for
   * @returns {Promise} Promise resolving to matching assets
   */
  async getMythicalBeingByProperty(property, value) {
    return this.searchAssets(value).then(result => {
      if (!result.assets || !result.assets.length) return [];
      
      // Filter assets with Mythical Beings properties
      // This assumes Mythical Beings assets have some identifying characteristic
      return result.assets.filter(asset => 
        (asset.name && asset.name.includes('Mythical')) ||
        (asset.description && asset.description.includes('Mythical Beings'))
      );
    });
  }
  
  /**
   * Send an asset transfer transaction
   * Note: This is a sensitive operation requiring passphrase
   * @param {Object} params - Transaction parameters
   * @returns {Promise} Promise resolving to transaction result
   */
  async transferAsset(params) {
    // Require passphrase
    if (!params.secretPhrase) {
      throw new Error('Passphrase required for asset transfers');
    }
    
    return this.makeRequest('transferAsset', {
      recipient: params.recipient,
      asset: params.asset,
      quantityQNT: params.quantityQNT || '1',
      secretPhrase: params.secretPhrase,
      feeNQT: params.feeNQT || '100000000', // 1 IGNIS default fee
      deadline: params.deadline || 60,
      message: params.message,
      messageIsText: params.messageIsText !== false
    });
  }
  
  /**
   * Place an ask order to sell an asset
   * @param {Object} params - Order parameters
   * @returns {Promise} Promise resolving to order placement result
   */
  async placeAskOrder(params) {
    if (!params.secretPhrase) {
      throw new Error('Passphrase required for placing orders');
    }
    
    return this.makeRequest('placeAskOrder', {
      asset: params.asset,
      quantityQNT: params.quantityQNT,
      priceNQT: params.priceNQT,
      secretPhrase: params.secretPhrase,
      feeNQT: params.feeNQT || '100000000',
      deadline: params.deadline || 60
    });
  }
  
  /**
   * Place a bid order to buy an asset
   * @param {Object} params - Order parameters
   * @returns {Promise} Promise resolving to order placement result
   */
  async placeBidOrder(params) {
    if (!params.secretPhrase) {
      throw new Error('Passphrase required for placing orders');
    }
    
    return this.makeRequest('placeBidOrder', {
      asset: params.asset,
      quantityQNT: params.quantityQNT,
      priceNQT: params.priceNQT,
      secretPhrase: params.secretPhrase,
      feeNQT: params.feeNQT || '100000000',
      deadline: params.deadline || 60
    });
  }
  
  /**
   * Get all child chain transactions for a specific asset
   * Used to track asset lifecycle events
   * @param {string} asset - Asset ID
   * @param {number} firstIndex - Pagination first index
   * @param {number} lastIndex - Pagination last index
   * @returns {Promise} Promise resolving to asset transactions
   */
  async getAssetTransactions(asset, firstIndex = 0, lastIndex = 100) {
    return this.makeRequest('getAssetTransfers', {
      asset,
      firstIndex,
      lastIndex
    });
  }
  
  /**
   * Get Mythical Beings game-specific data based on transaction attachments
   * @param {string} assetId - Asset ID
   * @returns {Promise<Object>} Promise resolving to game data
   */
  async getMythicalBeingGameData(assetId) {
    // First get the asset details
    const assetInfo = await this.getAsset(assetId, true);
    if (!assetInfo.asset) {
      throw new Error(`Asset ${assetId} not found`);
    }
    
    // Then get all messages attached to this asset to find game data
    const transfers = await this.getAssetTransactions(assetId);
    
    // Look for game data in transaction messages
    // This assumes game data is attached in JSON format in transaction messages
    const gameData = {
      assetId,
      name: assetInfo.name,
      description: assetInfo.description,
      issuer: assetInfo.account,
      quantity: assetInfo.quantityQNT,
      activities: [],
      attributes: {}
    };
    
    // Extract game data from transaction messages
    // This is just an example - actual implementation depends on how game data is stored
    if (transfers && transfers.transfers) {
      transfers.transfers.forEach(transfer => {
        if (transfer.attachment && transfer.attachment.message) {
          try {
            // Try to parse message as JSON
            const messageData = JSON.parse(transfer.attachment.message);
            if (messageData.activity) {
              gameData.activities.push({
                type: messageData.activity,
                timestamp: ardorTimestampToDate(transfer.timestamp),
                data: messageData.data,
                account: transfer.recipientRS
              });
            }
            
            // Add any attributes
            if (messageData.attributes) {
              gameData.attributes = {
                ...gameData.attributes,
                ...messageData.attributes
              };
            }
          } catch (e) {
            // Not JSON or other error - ignore
          }
        }
      });
    }
    
    return gameData;
  }
}

// Export singleton instance with default config
export const ardorApi = new ArdorAPI();

// Export API utilities
export const ARDOR_TRANSACTION_TYPES = {
  // Common transaction types in Ardor
  PAYMENT: { type: 0, subtype: 0 },
  ASSET_TRANSFER: { type: 2, subtype: 0 },
  ASSET_TRADE: { type: 2, subtype: 2 },
  MESSAGING: { type: 1, subtype: 0 },
  MARKETPLACE_LISTING: { type: 3, subtype: 0 },
  MARKETPLACE_REMOVAL: { type: 3, subtype: 1 },
  MARKETPLACE_PRICE_CHANGE: { type: 3, subtype: 2 },
  MARKETPLACE_QUANTITY_CHANGE: { type: 3, subtype: 3 },
  MARKETPLACE_PURCHASE: { type: 3, subtype: 4 },
  MARKETPLACE_DELIVERY: { type: 3, subtype: 5 },
  MARKETPLACE_FEEDBACK: { type: 3, subtype: 6 },
  MARKETPLACE_REFUND: { type: 3, subtype: 7 },
};

/**
 * Convert Ardor timestamp to JavaScript Date object
 * Ardor uses seconds since genesis block (2018-01-01 00:00:00 UTC)
 * 
 * @param {number} ardorTimestamp - Ardor blockchain timestamp
 * @returns {Date} JavaScript Date object
 */
export function ardorTimestampToDate(ardorTimestamp) {
  // Use the shared constant from ardor-utils.js
  const ardorEpochMillis = 1514764800000; // Jan 1, 2018 UTC
  return new Date(ardorEpochMillis + (ardorTimestamp * 1000));
}

/**
 * Convert JavaScript Date to Ardor timestamp
 * 
 * @param {Date} date - JavaScript Date object
 * @returns {number} Ardor timestamp (seconds since epoch)
 */
export function dateToArdorTimestamp(date) {
  // Ardor epoch start: 2018-01-01 00:00:00 UTC
  const ardorEpochMillis = Date.UTC(2018, 0, 1, 0, 0, 0, 0);
  return Math.floor((date.getTime() - ardorEpochMillis) / 1000);
}

/**
 * Format Ardor amount (accounting for decimals)
 * 
 * @param {string|number} amount - Amount in NQT (10^-8 ARDR)
 * @param {number} decimals - Number of decimal places (8 for ARDR)
 * @returns {string} Formatted amount
 */
export function formatArdorAmount(amount, decimals = 8) {
  if (!amount) return '0';
  
  // Convert to string and handle scientific notation
  const amountStr = String(amount);
  if (amountStr.includes('e')) {
    // Handle scientific notation
    const [mantissa, exponent] = amountStr.split('e');
    const exp = parseInt(exponent);
    if (exp < 0) {
      return (parseFloat(mantissa) * Math.pow(10, exp)).toFixed(decimals);
    }
  }
  
  // Convert from smallest unit to main unit
  const value = parseFloat(amount) / Math.pow(10, decimals);
  return value.toLocaleString(undefined, { 
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
}

/**
 * Get Mythical Beings specific asset IDs
 * These are the known asset IDs for Mythical Beings NFTs on Ardor
 * 
 * @returns {Object} Object with Mythical Beings asset IDs
 */
export function getMythicalBeingsAssetIds() {
  return {
    // Example asset IDs - replace with actual Mythical Beings asset IDs
    CREATURES: ['12345678901234567890', '09876543210987654321'],
    ITEMS: ['11223344556677889900', '00998877665544332211'],
    LANDS: ['13579246801357924680', '02468013579246801357']
  };
}

/**
 * Check if an Ardor node is reachable
 * @param {string} url - URL to check
 * @returns {Promise<boolean>} Whether the node is reachable
 */
export async function isArdorNodeReachable(url = defaultConfig.NODE_URL) {
  try {
    const api = new ArdorAPI({ NODE_URL: url });
    const status = await api.getBlockchainStatus();
    return !!status.application;
  } catch (error) {
    console.error('Ardor node check failed:', error);
    return false;
  }
}
