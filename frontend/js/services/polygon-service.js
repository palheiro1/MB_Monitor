/**
 * Polygon Service
 * 
 * This service provides specific functionality for Polygon blockchain data
 * using the Alchemy API for Mythical Beings NFT collection.
 * It focuses on users, transfers, trades, and other Polygon-specific activities.
 */

import { polygonApi, formatNFT, formatTransfer } from '../api/polygon-api.js';
import { TIME_PERIODS } from '../config.js';

/**
 * Service for Polygon blockchain data
 */
class PolygonService {
  /**
   * Initialize the service
   */
  constructor() {
    this.api = polygonApi;
    this.collectionAddress = this.api.collectionAddress;
    this.lastCheckedTimestamps = {
      transfers: 0
    };
    this.nftCache = new Map(); // Cache NFT metadata
  }
  
  /**
   * Check Polygon API connection
   * @returns {Promise<boolean>} Connection status
   */
  async checkConnection() {
    try {
      const blockNumber = await this.api.getBlockNumber();
      const isConnected = blockNumber > 0;
      console.log(`Polygon API connection: ${isConnected ? 'OK' : 'Failed'}`);
      return isConnected;
    } catch (error) {
      console.error('Polygon connection check failed:', error);
      return false;
    }
  }
  
  /**
   * Get collection statistics
   * @returns {Promise<Object>} Collection stats
   */
  async getCollectionStats() {
    try {
      return await this.api.getCollectionStats();
    } catch (error) {
      console.error('Error getting Polygon collection stats:', error);
      return {
        name: 'Mythical Beings',
        totalSupply: 0,
        floorPrice: 0,
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }
  
  /**
   * Get recent transfers filtered by criteria
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} Transfer data
   */
  async getTransfers(options = {}) {
    try {
      const transfers = await this.api.getTransfersForCollection(options);
      
      // Format transfers with metadata
      const formattedTransfers = await Promise.all(
        transfers.transfers.map(async transfer => {
          // Check cache for token metadata
          let tokenMetadata = {};
          if (transfer.tokenId && transfer.tokenId !== 'batch') {
            try {
              const cacheKey = `polygon-${this.collectionAddress}-${transfer.tokenId}`;
              if (this.nftCache.has(cacheKey)) {
                tokenMetadata = this.nftCache.get(cacheKey);
              } else {
                const nftData = await this.api.getNFTMetadata(transfer.tokenId);
                tokenMetadata = nftData.metadata || {};
                this.nftCache.set(cacheKey, tokenMetadata);
              }
            } catch (error) {
              console.warn(`Failed to get metadata for token #${transfer.tokenId}:`, error);
            }
          }
          
          // Format the transfer with additional metadata
          const formatted = formatTransfer(transfer);
          if (tokenMetadata.name) {
            formatted.card_name = tokenMetadata.name;
          }
          
          return formatted;
        })
      );
      
      // Apply period filter if applicable
      let filteredTransfers = formattedTransfers;
      if (options.period && TIME_PERIODS[options.period]) {
        const cutoffTime = new Date().getTime() - TIME_PERIODS[options.period];
        filteredTransfers = formattedTransfers.filter(transfer => 
          new Date(transfer.timestamp).getTime() >= cutoffTime
        );
      }
      
      // Sort by most recent
      filteredTransfers.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      return {
        transfers: filteredTransfers,
        total: filteredTransfers.length,
        hasMore: transfers.hasMore || false
      };
    } catch (error) {
      console.error('Error getting Polygon transfers:', error);
      return { transfers: [], total: 0, hasMore: false, error: error.message };
    }
  }
  
  /**
   * Get recent sales (transfers with price > 0)
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} Sales data
   */
  async getSales(options = {}) {
    try {
      const transfersData = await this.getTransfers(options);
      
      // Filter to only include sales (transfers with prices)
      const sales = transfersData.transfers.filter(transfer => 
        parseFloat(transfer.price) > 0
      );
      
      return {
        sales,
        total: sales.length,
        hasMore: transfersData.hasMore
      };
    } catch (error) {
      console.error('Error getting Polygon sales:', error);
      return { sales: [], total: 0, hasMore: false, error: error.message };
    }
  }
  
  /**
   * Get active user stats from transfers
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} User data
   */
  async getActiveUsers(options = {}) {
    try {
      const transfersData = await this.getTransfers({
        limit: 1000, // Get more data for better user stats
        ...options
      });
      
      // Extract unique addresses and build user profiles
      const userMap = new Map();
      
      transfersData.transfers.forEach(transfer => {
        const from = transfer.seller || transfer.from;
        const to = transfer.buyer || transfer.to;
        const price = parseFloat(transfer.price) || 0;
        const timestamp = new Date(transfer.timestamp).getTime();
        
        // Skip null addresses (mints/burns)
        const nullAddress = '0x0000000000000000000000000000000000000000';
        
        // Process sender if not null address
        if (from && from !== nullAddress) {
          const userId = from.toLowerCase();
          if (!userMap.has(userId)) {
            userMap.set(userId, {
              id: userId,
              address: from,
              transfers_count: 0,
              mints_count: 0,
              purchases_count: 0,
              sales_count: 0,
              volume_sold: 0,
              volume_bought: 0,
              first_seen: timestamp,
              last_seen: timestamp
            });
          }
          
          const userData = userMap.get(userId);
          userData.transfers_count++;
          userData.sales_count++;
          userData.volume_sold += price;
          
          if (timestamp < userData.first_seen) userData.first_seen = timestamp;
          if (timestamp > userData.last_seen) userData.last_seen = timestamp;
        }
        
        // Process recipient if not null address
        if (to && to !== nullAddress) {
          const userId = to.toLowerCase();
          if (!userMap.has(userId)) {
            userMap.set(userId, {
              id: userId,
              address: to,
              transfers_count: 0,
              mints_count: 0,
              purchases_count: 0,
              sales_count: 0,
              volume_sold: 0,
              volume_bought: 0,
              first_seen: timestamp,
              last_seen: timestamp
            });
          }
          
          const userData = userMap.get(userId);
          userData.transfers_count++;
          
          // From null address means it's a mint
          if (from === nullAddress) {
            userData.mints_count++;
          } else {
            userData.purchases_count++;
            userData.volume_bought += price;
          }
          
          if (timestamp < userData.first_seen) userData.first_seen = timestamp;
          if (timestamp > userData.last_seen) userData.last_seen = timestamp;
        }
      });
      
      // Convert Map to array and format dates
      const users = Array.from(userMap.values()).map(user => ({
        ...user,
        first_seen: new Date(user.first_seen).toISOString(),
        last_seen: new Date(user.last_seen).toISOString()
      }));
      
      // Sort by most active (highest transfer count)
      return users.sort((a, b) => b.transfers_count - a.transfers_count);
      
    } catch (error) {
      console.error('Error getting Polygon users:', error);
      return [];
    }
  }
  
  /**
   * Get NFT token details with metadata
   * @param {string} tokenId - Token ID
   * @returns {Promise<Object>} NFT data
   */
  async getNFTDetails(tokenId) {
    try {
      const cacheKey = `polygon-${this.collectionAddress}-${tokenId}`;
      
      // Check cache first
      if (this.nftCache.has(cacheKey)) {
        return this.nftCache.get(cacheKey);
      }
      
      const nftData = await this.api.getNFTMetadata(tokenId);
      const formattedNFT = formatNFT(nftData);
      
      // Cache the result
      this.nftCache.set(cacheKey, formattedNFT);
      return formattedNFT;
    } catch (error) {
      console.error(`Error fetching NFT #${tokenId}:`, error);
      return null;
    }
  }
  
  /**
   * Get NFT owner details
   * @param {string} tokenId - Token ID
   * @returns {Promise<Array>} Owners data
   */
  async getNFTOwners(tokenId) {
    try {
      // For ERC-1155, tokens can have multiple owners
      const ownersData = await this.api.getOwnersForToken(tokenId);
      
      return ownersData.owners || [];
    } catch (error) {
      console.error(`Error fetching owners for NFT #${tokenId}:`, error);
      return [];
    }
  }
  
  /**
   * Check for new transfers since last check
   * @returns {Promise<Object>} New transfers data
   */
  async getNewTransfersSinceLastCheck() {
    try {
      const lastChecked = this.lastCheckedTimestamps.transfers;
      const now = Date.now();
      
      // Get recent transfers
      const transfersData = await this.getTransfers({
        limit: 50 // Limit to recent transfers
      });
      
      // Filter for new transfers since last check
      const newTransfers = transfersData.transfers.filter(transfer => 
        new Date(transfer.timestamp).getTime() > lastChecked
      );
      
      // Update last checked timestamp
      this.lastCheckedTimestamps.transfers = now;
      
      return {
        transfers: newTransfers,
        count: newTransfers.length,
        timestamp: new Date(now).toISOString()
      };
    } catch (error) {
      console.error('Error checking for new Polygon transfers:', error);
      return { transfers: [], count: 0, error: error.message };
    }
  }
  
  /**
   * Get Polygon blockchain stats
   * @returns {Promise<Object>} Blockchain stats
   */
  async getPolygonStats() {
    try {
      const [collectionStats, blockNumber] = await Promise.all([
        this.getCollectionStats(),
        this.api.getBlockNumber()
      ]);
      
      // Get recent transfers to calculate trading volume
      const transfersData = await this.getTransfers({ 
        limit: 100,
        period: '30d'
      });
      
      const activeUsers = new Set();
      let tradingVolume = 0;
      
      // Process transfers for stats
      transfersData.transfers.forEach(transfer => {
        if (transfer.seller) activeUsers.add(transfer.seller);
        if (transfer.buyer) activeUsers.add(transfer.buyer);
        tradingVolume += parseFloat(transfer.price) || 0;
      });
      
      return {
        network: 'polygon',
        node_url: this.api.alchemyRpcUrl,
        connected: blockNumber > 0,
        current_block: blockNumber,
        name: collectionStats.name,
        symbol: collectionStats.symbol,
        total_supply: collectionStats.totalSupply,
        floor_price: collectionStats.floorPrice,
        floor_price_currency: collectionStats.floorPriceCurrency,
        transfer_count: transfersData.total,
        active_users: activeUsers.size,
        trading_volume: tradingVolume.toFixed(2),
        last_checked: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching Polygon stats:', error);
      return {
        network: 'polygon',
        connected: false,
        error: error.message,
        last_checked: new Date().toISOString()
      };
    }
  }
}

// Export a singleton instance
export const polygonService = new PolygonService();
