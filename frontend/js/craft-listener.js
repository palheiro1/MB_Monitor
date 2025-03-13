/**
 * CraftListener - Efficiently monitors for craft operations using JSON history
 */
class CraftListener {
  constructor(config) {
    this.config = config;
    this.contractAccount = 'ARDOR-4V3B-TVQA-Q6LF-GMH3T';
    this.burnAccount = 'ARDOR-Q9KZ-74XD-WERK-CV6GB';
    this.lastHeight = 0;
    this.isListening = false;
    this.intervalId = null;
    this.callbacks = {
      onCraftDetected: null,
      onMorphDetected: null,
      onBurnDetected: null
    };
  }

  /**
   * Start listening for new craft operations
   */
  start() {
    if (this.isListening) return;

    this.isListening = true;
    console.log('[CRAFT-LISTENER] Starting to listen for new craft operations');

    // Load initial history data
    this._loadInitialData();

    // Check for updates periodically
    const intervalTime = this.config.refreshInterval || 60000;
    this.intervalId = setInterval(() => this._checkForUpdates(), intervalTime);
  }

  /**
   * Stop listening
   */
  stop() {
    if (!this.isListening) return;

    this.isListening = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[CRAFT-LISTENER] Stopped listening for craft operations');
  }

  /**
   * Set callback for when a craft is detected
   */
  onCraftDetected(callback) {
    this.callbacks.onCraftDetected = callback;
  }

  /**
   * Set callback for when a morph is detected
   */
  onMorphDetected(callback) {
    this.callbacks.onMorphDetected = callback;
  }

  /**
   * Set callback for when a burn is detected
   */
  onBurnDetected(callback) {
    this.callbacks.onBurnDetected = callback;
  }

  /**
   * Load initial data from backend
   */
  async _loadInitialData() {
    try {
      // Get crafting history
      const craftResponse = await fetch('/api/craftings');
      const craftData = await craftResponse.json();

      if (craftData && craftData.length > 0) {
        console.log(`[CRAFT-LISTENER] Loaded ${craftData.length} craft records from history`);

        // Find the latest height to start monitoring from
        const heights = craftData.map(item => item.block || 0).filter(h => h > 0);
        this.lastHeight = heights.length > 0 ? Math.max(...heights) : 0;
        console.log(`[CRAFT-LISTENER] Will monitor for new transactions after block ${this.lastHeight}`);
      }

      // Get blockchain status to know current height
      const statusResponse = await fetch(`${this.config.ardorNodeUrl}/nxt?requestType=getBlockchainStatus`);
      const statusData = await statusResponse.json();

      if (statusData && statusData.numberOfBlocks) {
        // Only update if the blockchain is ahead of our last known height
        if (statusData.numberOfBlocks > this.lastHeight) {
          this.lastHeight = statusData.numberOfBlocks - 10; // Look back 10 blocks just to be safe
        }
      }
    } catch (error) {
      console.error('[CRAFT-LISTENER] Error loading initial data:', error);
    }
  }

  /**
   * Check for new craft operations
   */
  async _checkForUpdates() {
    if (!this.isListening) return;

    try {
      console.log(`[CRAFT-LISTENER] Checking for new craft operations since block ${this.lastHeight}`);

      // Get transactions from the contract account
      const response = await fetch(`${this.config.ardorNodeUrl}/nxt?requestType=getBlockchainTransactions&account=${this.contractAccount}&firstIndex=0&lastIndex=20&type=2&fromHeight=${this.lastHeight}`);
      const data = await response.json();

      if (!data || !data.transactions || !data.transactions.length) {
        console.log('[CRAFT-LISTENER] No new transactions found');
        return;
      }

      console.log(`[CRAFT-LISTENER] Found ${data.transactions.length} new transactions to process`);

      // Process each transaction
      for (const tx of data.transactions) {
        // Track the highest block number
        if (tx.height > this.lastHeight) {
          this.lastHeight = tx.height;
        }

        // Determine the operation type
        const operationType = await this._determineOperationType(tx);

        // Notify based on operation type
        if (operationType === 'craft' && this.callbacks.onCraftDetected) {
          this.callbacks.onCraftDetected(tx);
        } else if (operationType === 'morph' && this.callbacks.onMorphDetected) {
          this.callbacks.onMorphDetected(tx);
        } else if (operationType === 'burn' && this.callbacks.onBurnDetected) {
          this.callbacks.onBurnDetected(tx);
        }
      }

      // Also check for burns directly sent to the burn account
      this._checkForBurns();
    } catch (error) {
      console.error('[CRAFT-LISTENER] Error checking for updates:', error);
    }
  }

  /**
   * Check for burns (transfers to burn address)
   */
  async _checkForBurns() {
    try {
      const response = await fetch(`${this.config.ardorNodeUrl}/nxt?requestType=getBlockchainTransactions&recipient=${this.burnAccount}&firstIndex=0&lastIndex=20&type=2&fromHeight=${this.lastHeight}`);
      const data = await response.json();

      if (!data || !data.transactions || !data.transactions.length) {
        return;
      }

      console.log(`[CRAFT-LISTENER] Found ${data.transactions.length} potential burns`);

      // Process each transaction
      for (const tx of data.transactions) {
        // Track the highest block number
        if (tx.height > this.lastHeight) {
          this.lastHeight = tx.height;
        }

        // It's a burn if it's sent to the burn account
        if (tx.recipient === this.burnAccount && this.callbacks.onBurnDetected) {
          this.callbacks.onBurnDetected({
            ...tx,
            operationType: 'burn'
          });
        }
      }
    } catch (error) {
      console.error('[CRAFT-LISTENER] Error checking for burns:', error);
    }
  }

  /**
   * Determine the operation type from the transaction
   */
  async _determineOperationType(tx) {
    // Check if it's a burn (sent to burn address)
    if (tx.recipient === this.burnAccount) {
      return 'burn';
    }

    try {
      if (tx.attachment && tx.attachment.message) {
        try {
          const parsedMessage = JSON.parse(tx.attachment.message);
          if (parsedMessage.operation === 'craft') return 'craft';
          if (parsedMessage.operation === 'morph') return 'morph';
        } catch (e) {
          // Not a JSON message or couldn't parse
        }
      }
    } catch (error) {
      console.error('[CRAFT-LISTENER] Error determining operation type:', error);
    }

    // Default to craft if we can't determine
    return 'craft';
  }
}

export default CraftListener;
