/**
 * Application State Management
 * Centralized state store with event notification
 */

export class AppState {
  constructor() {
    // Initialize state
    this.state = {
      data: {
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
      },
      ui: {
        loading: false,
        currentTab: 'overview',
        period: 'all',
        filters: {
          cardType: null,
          cardRarity: null,
          dateRange: null
        }
      },
      lastUpdated: null
    };
    
    // Event listeners
    this.eventListeners = {
      dataUpdated: [],
      uiChanged: [],
      periodChanged: [],
      filterChanged: []
    };
  }

  /**
   * Update data in state and trigger events
   */
  updateData(data) {
    this.state.data = data;
    this.state.lastUpdated = new Date();
    this.triggerEvent('dataUpdated', data);
  }

  /**
   * Get current data
   */
  getData() {
    return this.state.data;
  }

  /**
   * Set loading state
   */
  setLoading(isLoading) {
    this.state.ui.loading = isLoading;
    this.triggerEvent('uiChanged', { loading: isLoading });
  }

  /**
   * Get loading state
   */
  isLoading() {
    return this.state.ui.loading;
  }

  /**
   * Set current tab
   */
  setCurrentTab(tabId) {
    this.state.ui.currentTab = tabId;
    this.triggerEvent('uiChanged', { currentTab: tabId });
  }

  /**
   * Get current tab
   */
  getCurrentTab() {
    return this.state.ui.currentTab;
  }

  /**
   * Set period filter
   */
  setPeriod(period) {
    this.state.ui.period = period;
    this.triggerEvent('periodChanged', period);
  }

  /**
   * Get current period
   */
  getPeriod() {
    return this.state.ui.period;
  }

  /**
   * Set filters
   */
  setFilter(filterType, value) {
    this.state.ui.filters[filterType] = value;
    this.triggerEvent('filterChanged', { 
      type: filterType, 
      value,
      filters: this.state.ui.filters
    });
  }

  /**
   * Get current filters
   */
  getFilters() {
    return this.state.ui.filters;
  }

  /**
   * Get last updated time
   */
  getLastUpdated() {
    return this.state.lastUpdated;
  }

  /**
   * Add event listener
   */
  addEventListener(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, callback) {
    if (!this.eventListeners[event]) {
      return;
    }
    this.eventListeners[event] = this.eventListeners[event].filter(
      listener => listener !== callback
    );
  }

  /**
   * Trigger event
   */
  triggerEvent(event, data) {
    if (!this.eventListeners[event]) {
      return;
    }
    this.eventListeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} event handler:`, error);
      }
    });
  }
}
