/**
 * Simplified Crafting Processor
 * Uses cached data with rate-limited polling
 */

class CraftingProcessor {
  constructor(config) {
    this.config = config;
    this.lastChecked = 0;
    this.minCheckInterval = 60000; // Minimum 1 minute between checks
    this.isProcessing = false;
  }
  
  async fetchCraftings() {
    const now = Date.now();
    
    // Don't check too frequently
    if (this.isProcessing || now - this.lastChecked < this.minCheckInterval) {
      return null;
    }
    
    try {
      this.isProcessing = true;
      const response = await fetch('/api/craftings');
      const data = await response.json();
      this.lastChecked = now;
      return data;
    } catch (error) {
      console.error('Failed to fetch craftings:', error);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }
}

export default new CraftingProcessor({
  refreshInterval: 60000
});
