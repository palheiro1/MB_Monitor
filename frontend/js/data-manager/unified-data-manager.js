/**
 * Unified Data Manager
 * Centralized data fetching and processing
 */

export class UnifiedDataManager {
  constructor(apiClient) {
    this.api = apiClient;
  }

  /**
   * Fetch all data types
   */
  async fetchAllData(period = 'all') {
    try {
      // Fetch unified data from the API
      const response = await this.api.fetchAllData(period);
      
      // Process the data
      return this.processData(response);
    } catch (error) {
      console.error('Error fetching unified data:', error);
      throw error;
    }
  }

  /**
   * Process raw data from the API
   */
  processData(data) {
    if (!data) {
      return {
        burns: [],
        craftings: [],
        trades: [],
        morphs: [],
        statistics: {
          totals: {
            burns: 0,
            craftings: 0,
            trades: 0,
            morphs: 0
          }
        }
      };
    }

    // Extract and process each data type
    const burns = this.processBurns(data.burns || []);
    const craftings = this.processCraftings(data.craftings || []);
    const trades = this.processTrades(data.trades || []);
    const morphs = this.processMorphs(data.morphs || []);
    
    // Calculate statistics
    const statistics = this.calculateStatistics({
      burns,
      craftings,
      trades,
      morphs
    });
    
    return {
      burns,
      craftings,
      trades,
      morphs,
      statistics,
      timestamp: data.timestamp || new Date().toISOString(),
      source: data.source || 'api'
    };
  }

  /**
   * Process burns data
   */
  processBurns(burns) {
    return burns.map(burn => ({
      ...burn,
      // Add any additional processing here
      date: new Date(burn.timestampISO || burn.timestamp),
      formattedDate: this.formatDate(burn.timestampISO || burn.timestamp)
    })).sort((a, b) => b.date - a.date);
  }

  /**
   * Process craftings data
   */
  processCraftings(craftings) {
    return craftings.map(craft => ({
      ...craft,
      // Add any additional processing here
      date: new Date(craft.timestampISO || craft.timestamp),
      formattedDate: this.formatDate(craft.timestampISO || craft.timestamp)
    })).sort((a, b) => b.date - a.date);
  }

  /**
   * Process trades data
   */
  processTrades(trades) {
    return trades.map(trade => ({
      ...trade,
      // Add any additional processing here
      date: new Date(trade.timestampISO || trade.timestamp),
      formattedDate: this.formatDate(trade.timestampISO || trade.timestamp),
      priceFormatted: this.formatPrice(trade.price || 0)
    })).sort((a, b) => b.date - a.date);
  }

  /**
   * Process morphs data
   */
  processMorphs(morphs) {
    return morphs.map(morph => ({
      ...morph,
      // Add any additional processing here
      date: new Date(morph.timestampISO || morph.timestamp),
      formattedDate: this.formatDate(morph.timestampISO || morph.timestamp)
    })).sort((a, b) => b.date - a.date);
  }

  /**
   * Calculate various statistics across all data
   */
  calculateStatistics(data) {
    const totals = {
      burns: data.burns.length,
      craftings: data.craftings.length,
      trades: data.trades.length,
      morphs: data.morphs.length
    };
    
    // Calculate card-specific statistics
    const cardStats = this.calculateCardStatistics(data);
    
    // Calculate user-specific statistics
    const userStats = this.calculateUserStatistics(data);
    
    return {
      totals,
      cards: cardStats,
      users: userStats,
      updated: new Date().toISOString()
    };
  }

  /**
   * Calculate card-specific statistics
   */
  calculateCardStatistics(data) {
    // Implementation would depend on your specific needs
    // Example: track most burned/crafted cards
    const cardCounts = {};
    
    // Process burns
    data.burns.forEach(burn => {
      const cardName = burn.cardName || 'Unknown';
      cardCounts[cardName] = cardCounts[cardName] || { burns: 0, crafts: 0, trades: 0 };
      cardCounts[cardName].burns += 1;
    });
    
    // Process craftings
    data.craftings.forEach(craft => {
      const cardName = craft.cardName || 'Unknown';
      cardCounts[cardName] = cardCounts[cardName] || { burns: 0, crafts: 0, trades: 0 };
      cardCounts[cardName].crafts += 1;
    });
    
    // Process trades
    data.trades.forEach(trade => {
      const cardName = trade.cardName || 'Unknown';
      cardCounts[cardName] = cardCounts[cardName] || { burns: 0, crafts: 0, trades: 0 };
      cardCounts[cardName].trades += 1;
    });
    
    return cardCounts;
  }

  /**
   * Calculate user-specific statistics
   */
  calculateUserStatistics(data) {
    // Implementation would depend on your specific needs
    // Example: track active users
    const userActivity = {};
    
    // Process burns
    data.burns.forEach(burn => {
      const user = burn.sender || 'Unknown';
      userActivity[user] = userActivity[user] || { burns: 0, crafts: 0, trades: 0 };
      userActivity[user].burns += 1;
    });
    
    // Process craftings
    data.craftings.forEach(craft => {
      const user = craft.recipient || 'Unknown';
      userActivity[user] = userActivity[user] || { burns: 0, crafts: 0, trades: 0 };
      userActivity[user].crafts += 1;
    });
    
    // Process trades
    data.trades.forEach(trade => {
      const seller = trade.seller || 'Unknown';
      const buyer = trade.buyer || 'Unknown';
      
      userActivity[seller] = userActivity[seller] || { burns: 0, crafts: 0, trades: 0, sales: 0 };
      userActivity[buyer] = userActivity[buyer] || { burns: 0, crafts: 0, trades: 0, purchases: 0 };
      
      userActivity[seller].sales = (userActivity[seller].sales || 0) + 1;
      userActivity[buyer].purchases = (userActivity[buyer].purchases || 0) + 1;
      userActivity[seller].trades += 1;
      userActivity[buyer].trades += 1;
    });
    
    return userActivity;
  }

  /**
   * Format date helper
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  /**
   * Format price helper
   */
  formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  }
}