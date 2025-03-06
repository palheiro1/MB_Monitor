/**
 * Blockchain Service
 * 
 * Integrates blockchain API modules into a unified service
 * for retrieving data related to Mythical Beings NFTs.
 */

import { ardorApi, ardorTimestampToDate, formatArdorAmount, getMythicalBeingsAssetIds } from '../api/ardor-api.js';
import { polygonApi, weiToEther, timestampToDate } from '../api/polygon-api.js';
import { polygonService } from './polygon-service.js';
import { TIME_PERIODS } from '../config.js';

// Constants for asset tracking
const REGULAR_CARDS_ISSUER = 'ARDOR-4V3B-TVQA-Q6LF-GMH3T';
const SPECIAL_CARDS_ISSUER = 'ARDOR-5NCL-DRBZ-XBWF-DDN5T';
const SPECIFIC_TOKEN_IDS = [
  '935701767940516955',
  '2188455459770682500', 
  '13993107092599641878',
  '10230963490193589789'
];
const POLYGON_CONTRACT_ADDRESS = '0xcf55f528492768330c0750a6527c1dfb50e2a7c3';

/**
 * Service for managing blockchain data access
 */
class BlockchainService {
  constructor() {
    this.ardorApi = ardorApi;
    this.polygonApi = polygonApi;
    this.polygonService = polygonService;
    this.mythicalBeingsAssetIds = getMythicalBeingsAssetIds();
    this.lastCheckedTimestamps = {
      ardor: 0,
      polygon: 0
    };
  }
  
  /**
   * Check Ardor node connection
   * @returns {Promise<boolean>} Connection status
   */
  async checkArdorConnection() {
    try {
      const status = await this.ardorApi.getBlockchainStatus();
      const isConnected = !!status && !!status.application;
      console.log(`Ardor node connection: ${isConnected ? 'OK' : 'Failed'}`);
      return isConnected;
    } catch (error) {
      console.error('Ardor connection check failed:', error);
      return false;
    }
  }
  
  /**
   * Get all Mythical Beings trades from Ardor
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Normalized trade data
   */
  async getArdorMythicalBeingsTrades(options = {}) {
    // Get all asset IDs to look for
    const assetIds = Object.values(this.mythicalBeingsAssetIds).flat();
    
    // Get trades for all relevant assets
    const allTradePromises = assetIds.map(assetId => 
      this.ardorApi.getAssetTrades(assetId, 0, 50)
    );
    
    try {
      const results = await Promise.all(allTradePromises);
      
      // Combine and normalize trades
      let allTrades = [];
      
      results.forEach((result, index) => {
        if (result.trades && result.trades.length > 0) {
          const assetId = assetIds[index];
          
          const normalizedTrades = result.trades.map(trade => ({
            id: trade.askOrderFullHash || trade.bidOrderFullHash,
            blockchain: 'ardor',
            timestamp: ardorTimestampToDate(trade.timestamp).toISOString(),
            card_name: trade.name || 'Unknown Asset',
            seller: trade.sellerRS || trade.seller,
            buyer: trade.buyerRS || trade.buyer,
            price: formatArdorAmount(trade.priceNQT),
            currency: 'IGNIS',
            asset_id: assetId,
            quantity: parseInt(trade.quantityQNT || '1', 10),
            transaction_hash: trade.askOrderFullHash,
            block_number: trade.block,
            raw_data: trade
          }));
          
          allTrades = [...allTrades, ...normalizedTrades];
        }
      });
      
      // Apply period filter if specified
      if (options.period && TIME_PERIODS[options.period]) {
        const cutoffTime = new Date().getTime() - TIME_PERIODS[options.period];
        allTrades = allTrades.filter(trade => 
          new Date(trade.timestamp).getTime() >= cutoffTime
        );
      }
      
      // Sort by most recent
      return allTrades.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error fetching Ardor trades:', error);
      throw error;
    }
  }
  
  /**
   * Get Ardor blockchain status and statistics
   * @returns {Promise<Object>} Blockchain status
   */
  async getArdorStats() {
    try {
      const [status, trades] = await Promise.all([
        this.ardorApi.getBlockchainStatus(),
        this.getArdorMythicalBeingsTrades() 
      ]);
      
      const assetIds = Object.values(this.mythicalBeingsAssetIds).flat();
      const activeUsers = new Set();
      
      // Count unique users from trades
      trades.forEach(trade => {
        if (trade.buyer) activeUsers.add(trade.buyer);
        if (trade.seller) activeUsers.add(trade.seller);
      });
      
      return {
        network: 'ardor',
        node_url: this.ardorApi.config.NODE_URL,
        connected: !!status.application,
        current_block: status.numberOfBlocks,
        last_block_timestamp: ardorTimestampToDate(status.lastBlockTimestamp).toISOString(),
        asset_count: assetIds.length,
        trade_count: trades.length,
        active_users: activeUsers.size,
        trading_volume: trades.reduce((sum, trade) => sum + parseFloat(trade.price), 0).toFixed(2),
        is_up_to_date: status.isUpToDate,
        version: status.version,
        last_checked: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching Ardor stats:', error);
      return {
        network: 'ardor',
        connected: false,
        error: error.message,
        last_checked: new Date().toISOString()
      };
    }
  }
  
  /**
   * Get new Ardor transactions since last check
   * @returns {Promise<Object>} New transactions
   */
  async getNewArdorTransactions() {
    try {
      const lastChecked = this.lastCheckedTimestamps.ardor;
      const now = Date.now();
      
      // Get recent trades
      const trades = await this.getArdorMythicalBeingsTrades();
      
      // Filter for new trades since last check
      const newTrades = trades.filter(trade => 
        new Date(trade.timestamp).getTime() > lastChecked
      );
      
      // Update last checked timestamp
      this.lastCheckedTimestamps.ardor = now;
      
      return {
        trades: newTrades,
        count: newTrades.length,
        timestamp: new Date(now).toISOString()
      };
    } catch (error) {
      console.error('Error checking for new Ardor transactions:', error);
      return { trades: [], count: 0, error: error.message };
    }
  }
  
  /**
   * Check Polygon API connection
   * @returns {Promise<boolean>} Connection status
   */
  async checkPolygonConnection() {
    return this.polygonService.checkConnection();
  }
  
  /**
   * Get Polygon blockchain status and statistics
   * @returns {Promise<Object>} Blockchain status
   */
  async getPolygonStats() {
    return this.polygonService.getPolygonStats();
  }
  
  /**
   * Get all Mythical Beings transfers from Polygon
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} Normalized transfer data
   */
  async getPolygonMythicalBeingsTransfers(options = {}) {
    return this.polygonService.getTransfers(options);
  }
  
  /**
   * Get new Polygon transactions since last check
   * @returns {Promise<Object>} New transactions
   */
  async getNewPolygonTransactions() {
    try {
      const lastChecked = this.lastCheckedTimestamps.polygon;
      const now = Date.now();
      
      // Get recent transfers
      const transfersData = await this.polygonService.getTransfers({
        limit: 50
      });
      
      // Filter for new transfers since last check
      const newTransfers = transfersData.transfers.filter(transfer => 
        new Date(transfer.timestamp).getTime() > lastChecked
      );
      
      // Update last checked timestamp
      this.lastCheckedTimestamps.polygon = now;
      
      return {
        transfers: newTransfers,
        count: newTransfers.length,
        timestamp: new Date(now).toISOString()
      };
    } catch (error) {
      console.error('Error checking for new Polygon transactions:', error);
      return { transfers: [], count: 0, error: error.message };
    }
  }
  
  /**
   * Get active Polygon users
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} User data
   */
  async getPolygonUsers(options = {}) {
    return this.polygonService.getActiveUsers(options);
  }
  
  /**
   * Get tracked assets from Ardor (regular cards, special cards, and specific tokens)
   * @returns {Promise<Object>} Ardor assets data
   */
  async getArdorTrackedAssets() {
    try {
      // Initialize the result structure
      const result = {
        regularCards: [],
        specialCards: [],
        specificTokens: [],
        timestamp: new Date().toISOString()
      };
      
      // Get Regular Cards (assets issued by REGULAR_CARDS_ISSUER)
      try {
        const regularCardsResponse = await this.ardorApi.getAccountIssuedAssets(REGULAR_CARDS_ISSUER, 0, 100);
        if (regularCardsResponse && regularCardsResponse.assets) {
          result.regularCards = regularCardsResponse.assets;
        }
      } catch (error) {
        console.error('Error fetching regular cards:', error);
      }
      
      // Get Special Cards (assets issued by SPECIAL_CARDS_ISSUER)
      try {
        const specialCardsResponse = await this.ardorApi.getAccountIssuedAssets(SPECIAL_CARDS_ISSUER, 0, 100);
        if (specialCardsResponse && specialCardsResponse.assets) {
          result.specialCards = specialCardsResponse.assets;
        }
      } catch (error) {
        console.error('Error fetching special cards:', error);
      }
      
      // Get Specific Token IDs
      const tokenPromises = SPECIFIC_TOKEN_IDS.map(assetId => 
        this.ardorApi.getAsset(assetId, true)
          .then(response => response)
          .catch(err => {
            console.error(`Error fetching token ${assetId}:`, err);
            return null;
          })
      );
      
      const tokenResults = await Promise.all(tokenPromises);
      result.specificTokens = tokenResults.filter(token => token !== null);
      
      return result;
    } catch (error) {
      console.error('Error fetching tracked Ardor assets:', error);
      return {
        regularCards: [],
        specialCards: [],
        specificTokens: [],
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Get tracked tokens from Polygon (ERC1155 tokens)
   * @returns {Promise<Object>} Polygon token data
   */
  async getPolygonTrackedTokens() {
    try {
      // Use polygonApi to get NFTs from the collection
      const nfts = await this.polygonApi.getNFTsForCollection({
        contractAddress: POLYGON_CONTRACT_ADDRESS,
        withMetadata: true,
        limit: 100
      });
      
      const metadata = {};
      if (nfts && nfts.nfts) {
        nfts.nfts.forEach(nft => {
          if (nft.id && nft.metadata) {
            metadata[nft.id.tokenId] = nft.metadata;
          }
        });
      }
      
      return {
        tokens: nfts?.nfts || [],
        metadata: metadata,
        contractInfo: nfts?.contractMetadata || null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching tracked Polygon tokens:', error);
      return {
        tokens: [],
        metadata: {},
        contractInfo: null,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Check for new activities across all blockchains
   * @returns {Promise<Object>} New activities
   */
  async checkForNewActivities() {
    try {
      const [ardorActivities, polygonActivities] = await Promise.all([
        this.getNewArdorTransactions(),
        this.getNewPolygonTransactions()
      ]);
      
      return {
        ardor: ardorActivities,
        polygon: polygonActivities,
        totalCount: ardorActivities.count + polygonActivities.count,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error checking for new activities:', error);
      return { totalCount: 0, error: error.message };
    }
  }
  
  /**
   * Get combined blockchain stats
   * @returns {Promise<Object>} Combined stats
   */
  async getCombinedStats() {
    try {
      const [ardorStats, polygonStats] = await Promise.all([
        this.getArdorStats(),
        this.getPolygonStats()
      ]);
      
      // Combine stats from both chains
      return {
        ardor: ardorStats,
        polygon: polygonStats,
        networks_connected: (ardorStats.connected ? 1 : 0) + (polygonStats.connected ? 1 : 0),
        total_trades: (ardorStats.trade_count || 0) + (polygonStats.transfer_count || 0),
        total_active_users: (ardorStats.active_users || 0) + (polygonStats.active_users || 0),
        total_volume_ardor: ardorStats.trading_volume || '0',
        total_volume_polygon: polygonStats.trading_volume || '0',
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting combined stats:', error);
      return {
        networks_connected: 0,
        error: error.message,
        last_updated: new Date().toISOString()
      };
    }
  }
}

// Export a singleton instance
export const blockchainService = new BlockchainService();
