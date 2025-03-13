/**
 * Craft Monitor
 * Monitors the blockchain for craft operations using stored history and live updates
 */
import { TransactionListener } from './api/transaction-listener.js';

export class CraftMonitor {
  constructor(config) {
    this.config = config;
    this.listener = new TransactionListener(config.ardorNodeUrl);
    this.craftingHistory = [];
    this.callbacks = {
      onNewCraft: null,
      onNewMorph: null,
      onNewBurn: null,
      onUpdate: null
    };
    
    // Initialize listeners
    this._setupListeners();
  }
  
  /**
   * Start monitoring for craft operations
   */
  async start() {
    console.log('[CRAFT-MONITOR] Starting craft monitoring');
    
    try {
      // First, load the existing crafting history
      await this._loadCraftingHistory();
      
      // Get the latest block height to start listening from
      const latestHeight = await this._getLatestBlockHeight();
      
      // Start listening for new transactions
      this.listener.startListening(latestHeight);
      
      console.log('[CRAFT-MONITOR] Craft monitoring started successfully');
    } catch (error) {
      console.error('[CRAFT-MONITOR] Error starting craft monitor:', error);
    }
  }
  
  /**
   * Stop monitoring
   */
  stop() {
    this.listener.stopListening();
    console.log('[CRAFT-MONITOR] Craft monitoring stopped');
  }
  
  /**
   * Set callback for new craft operations
   */
  onNewCraft(callback) {
    this.callbacks.onNewCraft = callback;
  }
  
  /**
   * Set callback for new morph operations
   */
  onNewMorph(callback) {
    this.callbacks.onNewMorph = callback;
  }
  
  /**
   * Set callback for new burn operations
   */
  onNewBurn(callback) {
    this.callbacks.onNewBurn = callback;
  }
  
  /**
   * Set callback for any updates
   */
  onUpdate(callback) {
    this.callbacks.onUpdate = callback;
  }
  
  /**
   * Load crafting history from storage
   */
  async _loadCraftingHistory() {
    try {
      const response = await fetch('/api/craftings');
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        this.craftingHistory = data;
        console.log(`[CRAFT-MONITOR] Loaded ${data.length} crafting records from history`);
      }
    } catch (error) {
      console.error('[CRAFT-MONITOR] Error loading crafting history:', error);
      throw error;
    }
  }
  
  /**
   * Get the latest block height
   */
  async _getLatestBlockHeight() {
    try {
      const response = await fetch(`${this.config.ardorNodeUrl}/nxt?requestType=getBlockchainStatus`);
      const data = await response.json();
      
      return data.numberOfBlocks || 0;
    } catch (error) {
      console.error('[CRAFT-MONITOR] Error getting latest block height:', error);
      return 0;
    }
  }
  
  /**
   * Set up listeners for transactions
   */
  _setupListeners() {
    // Craft listener
    this.listener.addEventListener('craft', (data) => {
      console.log('[CRAFT-MONITOR] New craft detected:', data);
      
      // Add to history
      this.craftingHistory.push(this._formatCraftData(data));
      
      // Notify callbacks
      if (this.callbacks.onNewCraft) {
        this.callbacks.onNewCraft(data);
      }
      
      if (this.callbacks.onUpdate) {
        this.callbacks.onUpdate('craft', data);
      }
    });
    
    // Morph listener
    this.listener.addEventListener('morph', (data) => {
      console.log('[CRAFT-MONITOR] New morph detected:', data);
      
      // Notify callbacks
      if (this.callbacks.onNewMorph) {
        this.callbacks.onNewMorph(data);
      }
      
      if (this.callbacks.onUpdate) {
        this.callbacks.onUpdate('morph', data);
      }
    });
    
    // Burn listener
    this.listener.addEventListener('burn', (data) => {
      console.log('[CRAFT-MONITOR] New burn detected:', data);
      
      // Notify callbacks
      if (this.callbacks.onNewBurn) {
        this.callbacks.onNewBurn(data);
      }
      
      if (this.callbacks.onUpdate) {
        this.callbacks.onUpdate('burn', data);
      }
    });
  }
  
  /**
   * Format craft data for consistency
   */
  _formatCraftData(data) {
    // Format the data to match the history format
    return {
      id: data.fullHash,
      blockchain: 'ardor',
      chain: data.chain,
      timestamp: data.timestamp,
      timestampISO: new Date(Date.UTC(2018, 0, 1, 0, 0, 0, 0) + data.timestamp * 1000).toISOString(),
      card_name: this._extractCardName(data),
      crafter: data.senderRS,
      transaction_hash: data.fullHash,
      block: data.height,
      // Additional details as needed
    };
  }
  
  /**
   * Extract card name from transaction data
   */
  _extractCardName(data) {
    // Try to extract from message
    if (data.message) {
      try {
        const messageData = typeof data.message === 'string' ? JSON.parse(data.message) : data.message;
        return messageData.cardName || 'Unknown Card';
      } catch (error) {
        // Not a JSON message or no card name
      }
    }
    
    // Try to get from asset name
    if (data.attachment && data.attachment.name) {
      return data.attachment.name;
    }
    
    return 'Unknown Card';
  }
}
