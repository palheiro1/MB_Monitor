/**
 * Mythical Beings Service
 * 
 * This service provides specific functionality for the Mythical Beings NFT collection.
 * It integrates with both Ardor and Polygon blockchain APIs to provide a unified
 * interface for accessing collection data across chains.
 */

import { polygonApi, formatNFT, formatTransfer } from '../api/polygon-api.js';
import { ardorApi, getMythicalBeingsAssetIds, ardorTimestampToDate, formatArdorAmount } from '../api/ardor-api.js';
import { TIME_PERIODS } from '../config.js';

/**
 * Service for Mythical Beings NFT collection
 */
class MythicalBeingsService {
  /**
   * Initialize the service
   */
  constructor() {
    this.polygonApi = polygonApi;
    this.ardorApi = ardorApi;
    this.mythicalBeingsAssetIds = getMythicalBeingsAssetIds();
    this.collectionAddress = polygonApi.collectionAddress;
    this.nftCache = new Map(); // Cache NFT metadata to reduce redundant API calls
  }
  
  /**
   * Get collection stats across both blockchains
   * @returns {Promise<Object>} Collection statistics
   */
  async getCollectionStats() {
    try {
      const [polygonStats, ardorStats] = await Promise.all([
        this.getPolygonCollectionStats(),
        this.getArdorCollectionStats()
      ]);
      
      // Merge stats from both chains
      return {
        name: "Mythical Beings",
        totalAssets: polygonStats.totalAssets + ardorStats.totalAssets,
        totalTrades: polygonStats.totalTrades + ardorStats.totalTrades,
        totalVolume: {
          polygon: {
            amount: polygonStats.totalVolume,
            currency: 'MATIC'
          },
          ardor: {
            amount: ardorStats.totalVolume,
            currency: 'IGNIS'
          }
        },
        chains: {
          polygon: polygonStats,
          ardor: ardorStats
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting collection stats:', error);
      throw error;
    }
  }
  
  /**
   * Get Polygon collection statistics
   * @returns {Promise<Object>} Polygon collection stats
   */
  async getPolygonCollectionStats() {
    try {
      // Get collection stats from Alchemy
      const stats = await this.polygonApi.getCollectionStats();
      
      // Get recent transfers to calculate trading volume
      const recentTransfers = await this.getPolygonTransfers({ period: '30d' });
      const totalVolume = recentTransfers.transfers.reduce((sum, transfer) => {
        return sum + (parseFloat(transfer.price) || 0);
      }, 0);
      
      return {
        totalAssets: parseInt(stats.totalSupply) || 0,
        floorPrice: stats.floorPrice,
        floorPriceCurrency: stats.floorPriceCurrency,
        totalTrades: recentTransfers.transfers.length,
        totalVolume: totalVolume.toFixed(2),
        lastUpdated: stats.lastUpdated
      };
    } catch (error) {
      console.error('Error getting Polygon collection stats:', error);
      return {
        totalAssets: 0,
        floorPrice: 0,
        totalTrades: 0,
        totalVolume: '0',
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }
  
  /**
   * Get Ardor collection statistics
   * @returns {Promise<Object>} Ardor collection stats
   */
  async getArdorCollectionStats() {
    try {
      const assetIds = Object.values(this.mythicalBeingsAssetIds).flat();
      
      // Get asset information for all assets
      const assetPromises = assetIds.map(assetId => 
        this.ardorApi.getAsset(assetId).catch(() => null)
      );
      
      const assetResults = await Promise.all(assetPromises);
      const validAssets = assetResults.filter(asset => asset !== null);
      
      // Calculate total supply and other metrics
      const totalAssets = validAssets.length;
      
      // Get recent trades to calculate volume
      const ardorTrades = await this.getArdorTrades({ period: '30d' });
      const totalVolume = ardorTrades.reduce((sum, trade) => {
        return sum + (parseFloat(trade.price) || 0);
      }, 0);
      
      return {
        totalAssets,
        totalTrades: ardorTrades.length,
        totalVolume: totalVolume.toFixed(2),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting Ardor collection stats:', error);
      return {
        totalAssets: 0,
        totalTrades: 0,
        totalVolume: '0',
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }
  
  /**
   * Get recent transfers from the Polygon collection
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} Transfer data
   */
  async getPolygonTransfers(options = {}) {
    try {
      // Convert time period to block range if needed
      const transfers = await this.polygonApi.getTransfersForCollection(options);
      
      // Format transfers
      const formattedTransfers = await Promise.all(
        transfers.transfers.map(async transfer => {
          // Look up token metadata if needed
          let tokenMetadata = {};
          if (transfer.tokenId && transfer.tokenId !== 'batch') {
            try {
              // Check cache first
              const cacheKey = `polygon-${this.collectionAddress}-${transfer.tokenId}`;
              if (this.nftCache.has(cacheKey)) {
                tokenMetadata = this.nftCache.get(cacheKey);
              } else {
                // Fetch from API if not in cache
                const nftData = await this.polygonApi.getNFTMetadata(transfer.tokenId);
                tokenMetadata = nftData.metadata || {};
                // Cache the result
                this.nftCache.set(cacheKey, tokenMetadata);
              }
            } catch (error) {
              console.warn(`Failed to get metadata for token #${transfer.tokenId}:`, error);
            }
          }
          
          // Format transfer with additional metadata
          const formatted = formatTransfer(transfer);
          
          // Add metadata fields
          if (tokenMetadata.name) {
            formatted.card_name = tokenMetadata.name;
          }
          
          return formatted;
        })
      );
      
      return {
        transfers: formattedTransfers,
        total: transfers.total || formattedTransfers.length,
        hasMore: transfers.hasMore || false
      };
    } catch (error) {
      console.error('Error getting Polygon transfers:', error);
      return { transfers: [], total: 0, hasMore: false, error: error.message };
    }
  }
  
  /**
   * Get recent trades from Ardor for Mythical Beings assets
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Trade data
   */
  async getArdorTrades(options = {}) {
    try {
      const assetIds = Object.values(this.mythicalBeingsAssetIds).flat();
      
      // Get trades for all relevant assets
      const allTradePromises = assetIds.map(assetId => 
        this.ardorApi.getAssetTrades(assetId, 0, 50)
          .then(result => result.trades || [])
          .catch(() => [])
      );
      
      const results = await Promise.all(allTradePromises);
      
      // Combine all trades
      let allTrades = [];
      results.forEach((trades, index) => {
        if (trades && trades.length > 0) {
          const assetId = assetIds[index];
          
          const normalizedTrades = trades.map(trade => ({
            id: trade.askOrderFullHash || trade.bidOrderFullHash,
            blockchain: 'ardor',
            timestamp: ardorTimestampToDate(trade.timestamp).toISOString(),
            card_name: trade.name || `Asset ${assetId}`,
            seller: trade.sellerRS || trade.seller,
            buyer: trade.buyerRS || trade.buyer,
            price: formatArdorAmount(trade.priceNQT),
            currency: 'IGNIS',
            quantity: parseInt(trade.quantityQNT || '1', 10),
            asset_id: assetId,
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
      return [];
    }
  }
  
  /**
   * Get NFT data for a specific token
   * @param {string} tokenId - Token ID to lookup
   * @param {string} blockchain - Blockchain identifier ('polygon' or 'ardor')
   * @returns {Promise<Object>} NFT metadata
   */
  async getNFTData(tokenId, blockchain = 'polygon') {
    if (blockchain === 'polygon') {
      const cacheKey = `polygon-${this.collectionAddress}-${tokenId}`;
      
      // Check cache first
      if (this.nftCache.has(cacheKey)) {
        return this.nftCache.get(cacheKey);
      }
      
      try {
        const nftData = await this.polygonApi.getNFTMetadata(tokenId);
        const formattedNFT = formatNFT(nftData);
        
        // Cache the result
        this.nftCache.set(cacheKey, formattedNFT);
        return formattedNFT;
      } catch (error) {
        console.error(`Error fetching NFT #${tokenId} from Polygon:`, error);
        return null;
      }
    } else if (blockchain === 'ardor') {
      const cacheKey = `ardor-${tokenId}`;
      
      // Check cache first
      if (this.nftCache.has(cacheKey)) {
        return this.nftCache.get(cacheKey);
      }
      
      try {
        const assetData = await this.ardorApi.getAsset(tokenId, true);
        
        const nftData = {
          id: `ardor-${tokenId}`,
          blockchain: 'ardor',
          tokenId: tokenId,
          name: assetData.name || `Asset #${tokenId}`,
          description: assetData.description || '',
          quantity: assetData.quantityQNT || '1',
          issuer: assetData.accountRS || assetData.account,
          raw: assetData
        };
        
        // Cache the result
        this.nftCache.set(cacheKey, nftData);
        return nftData;
      } catch (error) {
        console.error(`Error fetching NFT #${tokenId} from Ardor:`, error);
        return null;
      }
    } else {
      throw new Error(`Unsupported blockchain: ${blockchain}`);
    }
  }
  
  /**
   * Get recent NFT sales across both blockchains
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} Sales data
   */
  async getRecentSales(options = {}) {
    try {
      // Get trades from both chains
      const [polygonTransfers, ardorTrades] = await Promise.all([
        this.getPolygonTransfers(options),
        this.getArdorTrades(options)
      ]);
      
      // Filter to only include sales (transfers with prices)
      const polygonSales = polygonTransfers.transfers.filter(transfer => 
        parseFloat(transfer.price) > 0
      );
      
      const ardorSales = ardorTrades.filter(trade => 
        parseFloat(trade.price) > 0
      );
      
      // Combine all sales
      const allSales = [
        ...polygonSales.map(sale => ({ ...sale, platform: 'polygon' })),
        ...ardorSales.map(sale => ({ ...sale, platform: 'ardor' }))
      ];
      
      // Sort by most recent
      allSales.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      return {
        sales: allSales,
        total: allSales.length,
        polygonCount: polygonSales.length,
        ardorCount: ardorSales.length
      };
    } catch (error) {
      console.error('Error getting recent sales:', error);
      return { 
        sales: [],
        total: 0,
        polygonCount: 0,
        ardorCount: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Get NFT owners across both blockchains
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} Owners data
   */
  async getNFTOwners(options = {}) {
    const owners = {
      polygon: {},
      ardor: {},
      combined: {}
    };
    
    try {
      // Get Polygon ownership data
      // For ERC-1155, this requires looking at individual transfers
      const polygonTransfers = await this.polygonApi.getTransfersForCollection({
        limit: 1000, // Get a larger dataset to analyze ownership
        ...options
      });
      
      // Build ownership map from transfers
      // This is a simplified approach - for a production system,
      // you would need a more comprehensive ownership tracking system
      polygonTransfers.transfers.forEach(transfer => {
        if (transfer.tokenId && transfer.tokenId !== 'batch') {
          // Remove previous owner if there was a transfer
          if (transfer.from && transfer.from !== '0x0000000000000000000000000000000000000000') {
            delete owners.polygon[`${transfer.tokenId}-${transfer.from}`];
          }
          
          // Add current owner
          if (transfer.to && transfer.to !== '0x0000000000000000000000000000000000000000') {
            owners.polygon[`${transfer.tokenId}-${transfer.to}`] = {
              tokenId: transfer.tokenId,
              owner: transfer.to,
              quantity: transfer.amount || 1,
              blockchain: 'polygon'
            };
            
            // Update combined owners
            owners.combined[transfer.to] = (owners.combined[transfer.to] || 0) + 1;
          }
        }
      });
      
      // Get Ardor ownership data
      const assetIds = Object.values(this.mythicalBeingsAssetIds).flat();
      
      for (const assetId of assetIds) {
        try {
          const asset = await this.ardorApi.getAsset(assetId);
          if (asset && asset.accountRS) {
            owners.ardor[`${assetId}-${asset.accountRS}`] = {
              tokenId: assetId,
              owner: asset.accountRS,
              quantity: parseInt(asset.quantityQNT || '1', 10),
              blockchain: 'ardor'
            };
            
            // Update combined owners
            owners.combined[asset.accountRS] = (owners.combined[asset.accountRS] || 0) + 1;
          }
        } catch (err) {
          console.warn(`Failed to get ownership data for Ardor asset ${assetId}:`, err);
        }
      }
      
      return {
        polygonOwners: Object.values(owners.polygon),
        ardorOwners: Object.values(owners.ardor),
        // Convert to array of objects with address and count
        combinedOwners: Object.entries(owners.combined).map(([address, count]) => ({
          address,
          count
        })).sort((a, b) => b.count - a.count)
      };
    } catch (error) {
      console.error('Error getting NFT owners:', error);
      return { 
        polygonOwners: [],
        ardorOwners: [],
        combinedOwners: [],
        error: error.message
      };
    }
  }
  
  /**
   * Search for NFTs by name or attribute
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Matching NFTs
   */
  async searchNFTs(query, options = {}) {
    const results = [];
    
    if (!query || query.trim().length < 2) {
      return results;
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    
    try {
      // Search Polygon NFTs
      const polygonNFTs = await this.polygonApi.getNFTsForCollection({
        limit: options.limit || 20
      });
      
      if (polygonNFTs.nfts) {
        // Filter NFTs by query
        const matchingPolygonNFTs = polygonNFTs.nfts.filter(nft => {
          const metadata = nft.metadata || {};
          
          // Match by name
          if (metadata.name && metadata.name.toLowerCase().includes(normalizedQuery)) {
            return true;
          }
          
          // Match by description
          if (metadata.description && metadata.description.toLowerCase().includes(normalizedQuery)) {
            return true;
          }
          
          // Match by attributes
          if (metadata.attributes && Array.isArray(metadata.attributes)) {
            return metadata.attributes.some(attr =>
              (attr.trait_type && attr.trait_type.toLowerCase().includes(normalizedQuery)) ||
              (attr.value && attr.value.toString().toLowerCase().includes(normalizedQuery))
            );
          }
          
          // Match by token ID
          if (nft.id?.tokenId && nft.id.tokenId.toString().includes(normalizedQuery)) {
            return true;
          }
          
          return false;
        });
        
        // Format and add to results
        results.push(...matchingPolygonNFTs.map(nft => formatNFT(nft)));
      }
      
      // Search Ardor assets
      try {
        const ardorAssets = await this.ardorApi.searchAssets(normalizedQuery);
        
        if (ardorAssets.assets && ardorAssets.assets.length > 0) {
          // Filter to only include assets from our Mythical Beings collection
          const assetIds = Object.values(this.mythicalBeingsAssetIds).flat();
          const matchingArdorAssets = ardorAssets.assets.filter(asset =>
            assetIds.includes(asset.asset)
          );
          
          // Format and add to results
          results.push(...matchingArdorAssets.map(asset => ({
            id: `ardor-${asset.asset}`,
            blockchain: 'ardor',
            tokenId: asset.asset,
            name: asset.name || `Asset #${asset.asset}`,
            description: asset.description || '',
            quantity: asset.quantityQNT || '1',
            issuer: asset.accountRS || asset.account,
            raw: asset
          })));
        }
      } catch (ardorError) {
        console.error('Error searching Ardor assets:', ardorError);
      }
      
      // Sort results by relevance (simple implementation)
      return results.sort((a, b) => {
        // Give priority to exact name matches
        const aNameMatch = a.name && a.name.toLowerCase() === normalizedQuery ? 1 : 0;
        const bNameMatch = b.name && b.name.toLowerCase() === normalizedQuery ? 1 : 0;
        
        if (aNameMatch !== bNameMatch) return bNameMatch - aNameMatch;
        
        // Then to partial name matches
        const aNameIncludes = a.name && a.name.toLowerCase().includes(normalizedQuery) ? 1 : 0;
        const bNameIncludes = b.name && b.name.toLowerCase().includes(normalizedQuery) ? 1 : 0;
        
        if (aNameIncludes !== bNameIncludes) return bNameIncludes - aNameIncludes;
        
        // Finally sort alphabetically
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error('Error searching NFTs:', error);
      return [];
    }
  }
}

// Export singleton instance
export const mythicalBeingsService = new MythicalBeingsService();
