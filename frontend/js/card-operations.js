/**
 * Card Operations Module
 * This module handles card crafting, morphing, and burning operations.
 * REPLACEMENT: This replaces the previous implementation that was causing an infinite loop.
 */
import CraftListener from './craft-listener.js';

class CardOperations {
  constructor(config) {
    this.config = config;
    this.craftListener = new CraftListener(config);
    this.initialized = false;
  }
  
  /**
   * Initialize the card operations module
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('[CARD-OPERATIONS] Initializing card operations module');
    
    // Set up event handlers
    this.craftListener.onCraftDetected(this._handleCraftDetected.bind(this));
    this.craftListener.onMorphDetected(this._handleMorphDetected.bind(this));
    this.craftListener.onBurnDetected(this._handleBurnDetected.bind(this));
    
    // Start listening for new operations
    this.craftListener.start();
    
    this.initialized = true;
    console.log('[CARD-OPERATIONS] Card operations module initialized');
  }
  
  /**
   * Load crafting history data
   */
  async loadCraftingHistory() {
    try {
      const response = await fetch('/api/craftings');
      return await response.json();
    } catch (error) {
      console.error('[CARD-OPERATIONS] Error loading crafting history:', error);
      return [];
    }
  }
  
  /**
   * Load morphing history data
   */
  async loadMorphingHistory() {
    try {
      const response = await fetch('/api/morphs');
      return await response.json();
    } catch (error) {
      console.error('[CARD-OPERATIONS] Error loading morphing history:', error);
      return [];
    }
  }
  
  /**
   * Load burning history data
   */
  async loadBurningHistory() {
    try {
      const response = await fetch('/api/burns');
      return await response.json();
    } catch (error) {
      console.error('[CARD-OPERATIONS] Error loading burning history:', error);
      return [];
    }
  }
  
  /**
   * Handle a detected craft operation
   */
  _handleCraftDetected(data) {
    console.log('[CARD-OPERATIONS] Craft detected:', data);
    // Dispatch an event so other components can react
    const event = new CustomEvent('craft-detected', { detail: data });
    window.dispatchEvent(event);
  }
  
  /**
   * Handle a detected morph operation
   */
  _handleMorphDetected(data) {
    console.log('[CARD-OPERATIONS] Morph detected:', data);
    // Dispatch an event so other components can react
    const event = new CustomEvent('morph-detected', { detail: data });
    window.dispatchEvent(event);
  }
  
  /**
   * Handle a detected burn operation
   */
  _handleBurnDetected(data) {
    console.log('[CARD-OPERATIONS] Burn detected:', data);
    // Dispatch an event so other components can react
    const event = new CustomEvent('burn-detected', { detail: data });
    window.dispatchEvent(event);
  }
}

export default CardOperations;
