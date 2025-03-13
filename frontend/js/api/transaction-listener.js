/**
 * Transaction Listener
 * Efficiently monitors the blockchain for new crafting-related operations
 */
import { ArdorAPI } from './ardor-api.js';

export class TransactionListener {
  constructor(nodeUrl) {
    this.ardorApi = new ArdorAPI(nodeUrl);
    this.contractAccount = 'ARDOR-4V3B-TVQA-Q6LF-GMH3T';
    this.lastProcessedHeight = 0;
    this.isListening = false;
    this.listeners = {
      'craft': [],
      'morph': [],
      'burn': [],
      'newTransaction': []
    };
    
    // Cache for processed transactions to avoid duplicates
    this.processedTxs = new Set();
  }
  
  /**
   * Start listening for new transactions
   */
  startListening(startingHeight = 0) {
    if (this.isListening) return;
    
    this.lastProcessedHeight = startingHeight || 0;
    this.isListening = true;
    
    console.log(`[TRANSACTION-LISTENER] Starting to listen for transactions after height ${this.lastProcessedHeight}`);
    this._poll();
  }
  
  /**
   * Stop listening for new transactions
   */
  stopListening() {
    this.isListening = false;
    console.log('[TRANSACTION-LISTENER] Stopped listening for transactions');
  }
  
  /**
   * Add event listener
   */
  addEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }
  
  /**
   * Poll for new transactions
   */
  async _poll() {
    if (!this.isListening) return;
    
    try {
      // Only look for transactions from the contract account
      const transactions = await this._getNewTransactions();
      
      if (transactions && transactions.length > 0) {
        console.log(`[TRANSACTION-LISTENER] Found ${transactions.length} new transactions`);
        
        for (const tx of transactions) {
          // Skip if we've already processed this transaction
          if (this.processedTxs.has(tx.fullHash)) continue;
          
          // Add to processed set to avoid duplicates
          this.processedTxs.add(tx.fullHash);
          
          // Process the transaction
          this._processTransaction(tx);
          
          // Update the last processed height if needed
          if (tx.height > this.lastProcessedHeight) {
            this.lastProcessedHeight = tx.height;
          }
        }
      }
    } catch (error) {
      console.error('[TRANSACTION-LISTENER] Error polling for new transactions:', error);
    }
    
    // Poll again after a delay
    setTimeout(() => this._poll(), 30000); // Check every 30 seconds
  }
  
  /**
   * Get new transactions since last check
   */
  async _getNewTransactions() {
    const params = {
      account: this.contractAccount,
      firstIndex: 0,
      lastIndex: 100,
      type: 2, // Asset transfer type
      subtype: 0
    };
    
    // If we have a last height, only get transactions after that height
    if (this.lastProcessedHeight > 0) {
      params.fromHeight = this.lastProcessedHeight + 1;
    }
    
    try {
      const response = await this.ardorApi.makeRequest('getBlockchainTransactions', params);
      return response.transactions || [];
    } catch (error) {
      console.error('[TRANSACTION-LISTENER] Error fetching transactions:', error);
      return [];
    }
  }
  
  /**
   * Process a single transaction
   */
  async _processTransaction(tx) {
    // Notify generic listeners first
    this._notifyListeners('newTransaction', tx);
    
    // Check if this transaction has a message
    if (!tx.attachment || !tx.attachment.message) {
      // We need the message to determine the type
      try {
        const message = await this._getTransactionMessage(tx.fullHash);
        if (message) {
          // Determine the transaction type from the message
          const txType = this._determineTransactionType(message, tx);
          this._notifyListeners(txType, { ...tx, message });
        }
      } catch (error) {
        console.error(`[TRANSACTION-LISTENER] Error getting message for tx ${tx.fullHash}:`, error);
      }
    } else {
      // Message is already in the transaction
      const txType = this._determineTransactionType(tx.attachment.message, tx);
      this._notifyListeners(txType, { ...tx, message: tx.attachment.message });
    }
  }
  
  /**
   * Get transaction message if it's prunable
   */
  async _getTransactionMessage(fullHash) {
    try {
      // Try to get prunable message
      const prunableMessage = await this.ardorApi.makeRequest('getPrunableMessage', {
        transactionFullHash: fullHash
      });
      
      if (prunableMessage && prunableMessage.message) {
        return prunableMessage.message;
      }
      
      // If not found, try getting from the transaction itself
      const tx = await this.ardorApi.makeRequest('getTransaction', {
        fullHash,
        includePrunable: true
      });
      
      if (tx && tx.attachment && tx.attachment.message) {
        return tx.attachment.message;
      }
      
      return null;
    } catch (error) {
      console.error(`[TRANSACTION-LISTENER] Error getting message for tx ${fullHash}:`, error);
      return null;
    }
  }
  
  /**
   * Determine the transaction type from the message
   */
  _determineTransactionType(message, tx) {
    // Try to parse the message as JSON
    let messageData;
    try {
      if (typeof message === 'string') {
        messageData = JSON.parse(message);
      } else {
        messageData = message;
      }
    } catch (error) {
      // Not a JSON message
      return 'unknown';
    }
    
    // Check the operation type based on the message content
    if (messageData.operation === 'craft') return 'craft';
    if (messageData.operation === 'morph') return 'morph';
    if (messageData.operation === 'burn') return 'burn';
    
    // Check based on recipient or asset
    if (tx.recipient === 'ARDOR-Q9KZ-74XD-WERK-CV6GB') return 'burn';
    
    // Default to unknown
    return 'unknown';
  }
  
  /**
   * Notify listeners of an event
   */
  _notifyListeners(event, data) {
    if (this.listeners[event]) {
      for (const listener of this.listeners[event]) {
        try {
          listener(data);
        } catch (error) {
          console.error(`[TRANSACTION-LISTENER] Error in ${event} listener:`, error);
        }
      }
    }
  }
}
