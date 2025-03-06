/**
 * Polygon API Client
 * 
 * This module provides an interface to interact with the Polygon blockchain
 * via Alchemy API, with special support for NFT collections.
 * 
 * It's optimized for fetching data about the Mythical Beings NFT collection,
 * which uses the ERC-1155 standard.
 */

import { API_CONFIG } from '../config.js';

// Default Polygon configuration
const defaultConfig = {
  ...API_CONFIG.POLYGON,
  ALCHEMY_API_KEY: "KGbtj9EXEXr5LBBU7SnlFYznirnOcos7",
  ALCHEMY_BASE_URL: "https://polygon-mainnet.g.alchemy.com",
  NFT_COLLECTION_ADDRESS: "0xcf55f528492768330c0750a6527c1dfb50e2a7c3",
  IS_ERC1155: true
};

/**
 * PolygonAPI class for making requests to the Polygon blockchain via Alchemy
 */
export class PolygonAPI {
  /**
   * Initialize the PolygonAPI client
   * @param {Object} config - Optional configuration to override defaults
   */
  constructor(config = {}) {
    this.config = { ...defaultConfig, ...config };
    this.alchemyBaseUrl = this.config.ALCHEMY_BASE_URL;
    this.alchemyApiKey = this.config.ALCHEMY_API_KEY;
    this.alchemyNftUrl = `${this.alchemyBaseUrl}/nft/v2/${this.alchemyApiKey}`;
    this.alchemyRpcUrl = `${this.alchemyBaseUrl}/v2/${this.alchemyApiKey}`;
    this.collectionAddress = this.config.NFT_COLLECTION_ADDRESS;
    this.isErc1155 = this.config.IS_ERC1155;
    this.scanApiUrl = this.config.SCAN_API_URL;
    this.scanApiKey = this.config.API_KEY;
    this.requestId = 1; // For JSON-RPC requests
  }
  
  /**
   * Make a JSON-RPC request to Alchemy
   * @param {string} method - RPC method name
   * @param {Array} params - Method parameters
   * @returns {Promise} Promise resolving to the RPC response
   */
  async makeRpcRequest(method, params = []) {
    // Implement retry logic
    let retries = 0;
    let lastError = null;
    
    while (retries <= this.config.MAX_RETRIES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.REQUEST_TIMEOUT);
        
        const response = await fetch(this.alchemyRpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: this.requestId++,
            method,
            params
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Alchemy API error (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        
        // Check if the response contains an error
        if (data.error) {
          throw new Error(`Alchemy API error (${data.error.code}): ${data.error.message}`);
        }
        
        return data.result;
      } catch (error) {
        lastError = error;
        retries++;
        
        if (error.name === 'AbortError') {
          console.warn(`Alchemy request timed out: ${method}`);
        } else {
          console.warn(`Alchemy request failed (attempt ${retries}/${this.config.MAX_RETRIES}):`, error);
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
   * Make a request to the Alchemy NFT API
   * @param {string} path - API endpoint path
   * @param {Object} params - Query parameters
   * @returns {Promise} Promise resolving to the API response
   */
  async makeNftApiRequest(path, params = {}) {
    const url = new URL(`${this.alchemyNftUrl}${path}`);
    
    // Add query parameters
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
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
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Alchemy NFT API error (${response.status}): ${errorText}`);
        }
        
        return response.json();
      } catch (error) {
        lastError = error;
        retries++;
        
        if (error.name === 'AbortError') {
          console.warn(`Alchemy NFT API request timed out: ${path}`);
        } else {
          console.warn(`Alchemy NFT API request failed (attempt ${retries}/${this.config.MAX_RETRIES}):`, error);
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
   * Make a request to the Polygonscan API
   * @param {string} module - API module (e.g., 'account', 'contract')
   * @param {string} action - API action (e.g., 'txlist', 'balance')
   * @param {Object} params - Additional API parameters
   * @returns {Promise} Promise resolving to the API response
   */
  async makeScanRequest(module, action, params = {}) {
    // Build the request URL with parameters
    const url = new URL(this.scanApiUrl);
    
    // Add standard parameters
    const queryParams = {
      module,
      action,
      apikey: this.scanApiKey,
      ...params
    };
    
    // Add all parameters to the URL
    Object.keys(queryParams).forEach(key => {
      if (queryParams[key] !== undefined && queryParams[key] !== null) {
        url.searchParams.append(key, queryParams[key]);
      }
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
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Polygonscan API error (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        
        // Check if the response contains an error from Polygonscan
        if (data.status === '0') {
          // Some errors are actually empty results, not real errors
          if (data.message === 'No transactions found' || data.result.length === 0) {
            return { result: [] };
          }
          throw new Error(`Polygonscan API error: ${data.message}`);
        }
        
        return data;
      } catch (error) {
        lastError = error;
        retries++;
        
        if (error.name === 'AbortError') {
          console.warn(`Polygonscan API request timed out: ${module}/${action}`);
        } else {
          console.warn(`Polygonscan API request failed (attempt ${retries}/${this.config.MAX_RETRIES}):`, error);
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
   * Get NFTs by collection (contract address)
   * Specifically for Mythical Beings collection
   * @param {Object} options - Options like page key for pagination
   * @returns {Promise} Promise resolving to NFTs in the collection
   */
  async getNFTsForCollection(options = {}) {
    const params = {
      contractAddress: this.collectionAddress,
      withMetadata: true,
      limit: options.limit || 100,
      ...options
    };
    
    // Use the correct endpoint based on token standard
    const endpoint = this.isErc1155 ? 
      '/getNFTsForCollection' : 
      '/getNFTsForContract';
    
    return this.makeNftApiRequest(endpoint, params);
  }
  
  /**
   * Get a specific NFT from the collection
   * @param {string} tokenId - Token ID
   * @returns {Promise} Promise resolving to NFT data
   */
  async getNFTMetadata(tokenId) {
    const params = {
      contractAddress: this.collectionAddress,
      tokenId: tokenId,
      tokenType: this.isErc1155 ? 'ERC1155' : 'ERC721'
    };
    
    return this.makeNftApiRequest('/getNFTMetadata', params);
  }
  
  /**
   * Get NFT transfer history for the collection
   * @param {Object} options - Options like pagination
   * @returns {Promise} Promise resolving to transfer history
   */
  async getTransfersForCollection(options = {}) {
    // For ERC-1155 transfers, we need to use contract events
    if (this.isErc1155) {
      // TransferSingle and TransferBatch are ERC-1155 transfer event signatures
      const transferSingleTopic = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62';
      const transferBatchTopic = '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb';
      
      // Get the timestamp for the specified period
      let fromBlock = 'earliest';
      if (options.period) {
        // Convert period to block number approximately
        // This is a rough estimation
        const periodBlockMapping = {
          '24h': 'latest-4320',  // ~86400/20 blocks (assuming 20s block time)
          '7d': 'latest-30240',  // ~604800/20 blocks
          '30d': 'latest-129600' // ~2592000/20 blocks
        };
        fromBlock = periodBlockMapping[options.period] || 'earliest';
      }
      
      // Query both single and batch transfers
      const [singleTransfers, batchTransfers] = await Promise.all([
        this.getContractEvents({
          address: this.collectionAddress,
          topics: [transferSingleTopic],
          fromBlock,
          toBlock: 'latest'
        }),
        this.getContractEvents({
          address: this.collectionAddress,
          topics: [transferBatchTopic],
          fromBlock,
          toBlock: 'latest'
        })
      ]);
      
      // Process both types of transfers
      const processedSingleTransfers = this.processErc1155SingleTransfers(singleTransfers);
      const processedBatchTransfers = this.processErc1155BatchTransfers(batchTransfers);
      
      // Combine and sort by timestamp (newest first)
      const allTransfers = [...processedSingleTransfers, ...processedBatchTransfers]
        .sort((a, b) => b.timestamp - a.timestamp);
      
      // Apply pagination
      const start = options.offset || 0;
      const limit = options.limit || 100;
      const paginatedTransfers = allTransfers.slice(start, start + limit);
      
      return {
        transfers: paginatedTransfers,
        total: allTransfers.length,
        pageSize: paginatedTransfers.length,
        hasMore: start + limit < allTransfers.length
      };
    } 
    
    // For non-ERC1155 (e.g. ERC721), we can use the NFT API
    const contractAddr = this.collectionAddress.toLowerCase();
    const params = {
      contractAddress: contractAddr,
      ...options
    };
    
    return this.makeNftApiRequest('/getTransfersByContractAddress', params);
  }
  
  /**
   * Process ERC-1155 single transfer events into a normalized format
   * @param {Array} events - Raw contract events
   * @returns {Array} Normalized transfers
   */
  processErc1155SingleTransfers(events) {
    if (!Array.isArray(events)) return [];
    
    return events.map(event => {
      // Decode event data
      const topics = event.topics || [];
      const data = event.data || '0x';
      
      // Topics[0] is the event signature
      // Topics[1] is the operator address (padded to 32 bytes)
      // Topics[2] is the from address (padded to 32 bytes)
      // Topics[3] is the to address (padded to 32 bytes)
      // Data contains tokenId and value, both uint256
      
      // Extract addresses from topics (removing padding)
      const operator = '0x' + topics[1].slice(26);
      const from = '0x' + topics[2].slice(26);
      const to = '0x' + topics[3].slice(26);
      
      // Extract tokenId and value from data
      const dataWithout0x = data.slice(2); // Remove '0x' prefix
      const tokenId = parseInt(dataWithout0x.slice(0, 64), 16).toString();
      const value = parseInt(dataWithout0x.slice(64), 16);
      
      // Get block timestamp
      const timestamp = parseInt(event.timeStamp || '0', 16) * 1000; // Convert to milliseconds
      
      return {
        id: event.transactionHash + '-' + event.logIndex,
        type: 'transfer',
        tokenType: 'ERC1155',
        contractAddress: this.collectionAddress,
        from,
        to,
        tokenId,
        amount: value,
        transactionHash: event.transactionHash,
        blockNumber: parseInt(event.blockNumber || '0', 16),
        blockHash: event.blockHash,
        timestamp: new Date(timestamp),
        operator
      };
    });
  }
  
  /**
   * Process ERC-1155 batch transfer events into a normalized format
   * @param {Array} events - Raw contract events
   * @returns {Array} Normalized transfers
   */
  processErc1155BatchTransfers(events) {
    if (!Array.isArray(events)) return [];
    
    const transfers = [];
    
    events.forEach(event => {
      // Decode event data
      const topics = event.topics || [];
      const data = event.data || '0x';
      
      // Topics[0] is the event signature
      // Topics[1] is the operator address
      // Topics[2] is the from address
      // Topics[3] is the to address
      // Data contains offset for tokenIds array, offset for values array,
      // length of tokenIds array, tokenIds, length of values array, values
      
      // Extract addresses from topics (removing padding)
      const operator = '0x' + topics[1].slice(26);
      const from = '0x' + topics[2].slice(26);
      const to = '0x' + topics[3].slice(26);
      
      // This is complex to decode without a proper ABI decoder
      // For simplicity, we'll just record the batch transfer without individual tokenIds
      const timestamp = parseInt(event.timeStamp || '0', 16) * 1000; // Convert to milliseconds
      
      transfers.push({
        id: event.transactionHash + '-' + event.logIndex,
        type: 'batchTransfer',
        tokenType: 'ERC1155',
        contractAddress: this.collectionAddress,
        from,
        to,
        tokenId: 'batch', // Batch transfer contains multiple tokenIds
        amount: 'multiple', // Batch transfer contains multiple amounts
        transactionHash: event.transactionHash,
        blockNumber: parseInt(event.blockNumber || '0', 16),
        blockHash: event.blockHash,
        timestamp: new Date(timestamp),
        operator,
        rawData: data // Store raw data for reference
      });
    });
    
    return transfers;
  }
  
  /**
   * Get NFT owners for a specific token ID
   * @param {string} tokenId - Token ID
   * @returns {Promise} Promise resolving to owners data
   */
  async getOwnersForToken(tokenId) {
    const params = {
      contractAddress: this.collectionAddress,
      tokenId: tokenId,
      tokenType: this.isErc1155 ? 'ERC1155' : 'ERC721'
    };
    
    return this.makeNftApiRequest('/getOwnersForToken', params);
  }
  
  /**
   * Get owner of multiple NFTs
   * Used for ERC-1155 tokens which can have multiple owners for the same token ID
   * @param {string} tokenId - Token ID
   * @returns {Promise} Promise resolving to owners data
   */
  async getOwnersForNFT(tokenId) {
    if (!this.isErc1155) {
      // For ERC-721, just get the single owner
      return this.getOwnersForToken(tokenId);
    }
    
    // For ERC-1155, get all owners with their balances
    const params = {
      contractAddress: this.collectionAddress,
      tokenId: tokenId
    };
    
    return this.makeNftApiRequest('/getOwnersForToken', params);
  }
  
  /**
   * Get NFT floor price from Alchemy
   * @returns {Promise} Promise resolving to floor price data
   */
  async getFloorPrice() {
    return this.makeNftApiRequest('/getFloorPrice', { contractAddress: this.collectionAddress });
  }
  
  /**
   * Get NFT sales by contract address and time period
   * @param {Object} options - Options like time period
   * @returns {Promise} Promise resolving to sales data
   */
  async getNFTSales(options = {}) {
    const params = {
      contractAddress: this.collectionAddress,
      ...options
    };
    
    return this.makeNftApiRequest('/getNFTSales', params);
  }
  
  /**
   * Get current block number
   * @returns {Promise} Promise resolving to the latest block number
   */
  async getBlockNumber() {
    return this.makeRpcRequest('eth_blockNumber').then(hex => parseInt(hex, 16));
  }
  
  /**
   * Get block by number
   * @param {number|string} blockNumber - Block number or 'latest'
   * @param {boolean} includeTransactions - Whether to include full transaction objects
   * @returns {Promise} Promise resolving to block data
   */
  async getBlockByNumber(blockNumber, includeTransactions = false) {
    const blockParam = typeof blockNumber === 'number' ? 
      '0x' + blockNumber.toString(16) : blockNumber;
    return this.makeRpcRequest('eth_getBlockByNumber', [blockParam, includeTransactions]);
  }
  
  /**
   * Get balance for an Ethereum address
   * @param {string} address - Ethereum address
   * @param {string} tag - Block parameter (latest, earliest, pending)
   * @returns {Promise} Promise resolving to balance in wei
   */
  async getBalance(address, tag = 'latest') {
    return this.makeRpcRequest('eth_getBalance', [address, tag]);
  }
  
  /**
   * Get transaction by hash
   * @param {string} txHash - Transaction hash
   * @returns {Promise} Promise resolving to transaction data
   */
  async getTransaction(txHash) {
    return this.makeRpcRequest('eth_getTransactionByHash', [txHash]);
  }
  
  /**
   * Get transaction receipt
   * @param {string} txHash - Transaction hash
   * @returns {Promise} Promise resolving to transaction receipt
   */
  async getTransactionReceipt(txHash) {
    return this.makeRpcRequest('eth_getTransactionReceipt', [txHash]);
  }
  
  /**
   * Get normal transactions for an address using Polygonscan API
   * @param {string} address - Ethereum address
   * @param {Object} options - Options like start/end block, page, sort
   * @returns {Promise} Promise resolving to transactions list
   */
  async getAddressTransactions(address, options = {}) {
    return this.makeScanRequest('account', 'txlist', {
      address,
      startblock: options.startBlock || 0,
      endblock: options.endBlock || 99999999,
      page: options.page || 1,
      offset: options.offset || 100,
      sort: options.sort || 'desc',
      ...options
    });
  }
  
  /**
   * Get ERC721 token transfers for an address or contract
   * @param {Object} params - Parameters like address, contract address, page
   * @returns {Promise} Promise resolving to NFT transfers
   */
  async getERC721Transfers(params = {}) {
    return this.makeScanRequest('account', 'tokennfttx', {
      page: params.page || 1,
      offset: params.offset || 100,
      sort: params.sort || 'desc',
      ...params
    });
  }
  
  /**
   * Get events for a specific contract
   * @param {Object} options - Options like topics, fromBlock, toBlock
   * @returns {Promise} Promise resolving to events data
   */
  async getContractEvents(options) {
    return this.makeRpcRequest('eth_getLogs', [{
      address: options.address,
      fromBlock: options.fromBlock || 'earliest',
      toBlock: options.toBlock || 'latest',
      topics: options.topics || [],
      ...options
    }]);
  }
  
  /**
   * Get Mythical Beings NFT collection stats
   * @returns {Promise} Promise resolving to collection stats
   */
  async getCollectionStats() {
    try {
      // Get various stats about the collection
      const [metadata, floorPrice, blockNumber] = await Promise.all([
        this.getNFTsForCollection({ limit: 1 }), // Just to get collection metadata
        this.getFloorPrice(),
        this.getBlockNumber()
      ]);
      
      // Build stats object
      return {
        address: this.collectionAddress,
        tokenType: this.isErc1155 ? 'ERC1155' : 'ERC721',
        name: metadata.contractMetadata?.name || 'Mythical Beings',
        symbol: metadata.contractMetadata?.symbol || 'MB',
        totalSupply: metadata.contractMetadata?.totalSupply || 'Unknown',
        floorPrice: floorPrice.openSea?.floorPrice || 0,
        floorPriceCurrency: floorPrice.openSea?.priceCurrency || 'ETH',
        lastBlockNumber: blockNumber,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting collection stats:', error);
      throw error;
    }
  }
}

// Export singleton instance with default config
export const polygonApi = new PolygonAPI();

/**
 * Convert wei to ether
 * @param {string} wei - Amount in wei
 * @returns {string} Amount in ether
 */
export function weiToEther(wei) {
  if (!wei) return '0';
  
  // Handle hex strings
  const weiValue = wei.startsWith('0x') ? BigInt(wei) : wei;
  
  // 1 ETH = 10^18 wei
  const ether = Number(BigInt(weiValue) / BigInt(10**16)) / 100;
  return ether.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

/**
 * Convert hex to decimal
 * @param {string} hex - Hex string
 * @returns {number} Decimal value
 */
export function hexToDecimal(hex) {
  if (!hex || !hex.startsWith('0x')) return 0;
  return parseInt(hex, 16);
}

/**
 * Convert UNIX timestamp to Date object
 * @param {string|number} timestamp - UNIX timestamp (seconds)
 * @returns {Date} JavaScript Date object
 */
export function timestampToDate(timestamp) {
  // Handle hex timestamps
  const timeValue = typeof timestamp === 'string' && timestamp.startsWith('0x') ?
    parseInt(timestamp, 16) : parseInt(timestamp);
    
  return new Date(timeValue * 1000);
}

/**
 * Format NFT data into a standard format for display
 * @param {Object} nft - NFT data from Alchemy API
 * @returns {Object} Standardized NFT data
 */
export function formatNFT(nft) {
  const metadata = nft.metadata || {};
  const tokenId = nft.id?.tokenId || '0';
  
  return {
    id: `polygon-${nft.contract.address}-${tokenId}`,
    blockchain: 'polygon',
    contractAddress: nft.contract.address,
    tokenId,
    name: metadata.name || `Mythical Being #${tokenId}`,
    description: metadata.description || '',
    image: metadata.image?.replace('ipfs://', 'https://ipfs.io/ipfs/') || '',
    attributes: metadata.attributes || [],
    tokenType: nft.id?.tokenType || 'ERC1155',
    supply: parseInt(nft.balance || '1', 16),
    rarity: calculateRarity(metadata.attributes),
    raw: nft
  };
}

/**
 * Format transfer data into a standard format for display
 * @param {Object} transfer - Transfer data
 * @returns {Object} Standardized transfer data
 */
export function formatTransfer(transfer) {
  // Format the timestamp
  const timestamp = transfer.timestamp instanceof Date ? 
    transfer.timestamp : new Date(transfer.timestamp || Date.now());
  
  return {
    id: transfer.id || transfer.transactionHash || `tx-${Math.random().toString(36).substring(2, 10)}`,
    blockchain: 'polygon',
    timestamp: timestamp.toISOString(),
    card_name: transfer.tokenName || transfer.title || `Token #${transfer.tokenId}`,
    seller: transfer.from,
    buyer: transfer.to,
    price: transfer.price || '0',
    currency: transfer.currency || 'MATIC',
    tokenId: transfer.tokenId,
    quantity: transfer.amount || 1,
    transaction_hash: transfer.transactionHash,
    block_number: transfer.blockNumber,
    raw_data: transfer
  };
}

/**
 * Calculate rarity score for an NFT based on its attributes
 * @param {Array} attributes - NFT attributes array
 * @returns {number} Rarity score (higher is more rare)
 */
function calculateRarity(attributes) {
  if (!Array.isArray(attributes) || attributes.length === 0) return 0;
  
  // A very simple rarity calculation - this should be enhanced based on your collection's traits
  let rarityScore = 0;
  
  attributes.forEach(attr => {
    // Traits with lower trait_count values are more rare
    if (attr.trait_type && attr.value) {
      // Use trait_count if available, otherwise just count as 1
      const traitRarity = 1 / (attr.trait_count || 1);
      rarityScore += traitRarity;
    }
  });
  
  return rarityScore;
}
