/**
 * MB Monitor - Core Application
 * Centralized application entry point and initialization
 */

import { BlockchainClient } from './api/blockchain-client.js';
import { UnifiedDataManager } from './data-manager/unified-data-manager.js';
import { AppState } from './state/index.js';
import { TransactionRenderer } from './components/transaction-renderer.js';
import { TabController } from './components/tab-controllers.js';
import { ChartManager } from './components/charts.js';
import { formatters } from './utils/formatters.js';

class AppCore {
  constructor() {
    // Initialize core components
    this.state = new AppState();
    this.api = new BlockchainClient();
    this.dataManager = new UnifiedDataManager(this.api);
    
    // Initialize UI components
    this.renderer = new TransactionRenderer();
    this.tabController = new TabController();
    this.chartManager = new ChartManager();
    
    // Bind event handlers
    this.bindEvents();
  }

  /**
   * Initialize the application
   */
  async init() {
    // Show loading state
    this.state.setLoading(true);
    
    try {
      // Load initial data
      const data = await this.dataManager.fetchAllData();
      
      // Update application state
      this.state.updateData(data);
      
      // Initialize UI with data
      this.initializeUI();
      
      // Set up periodic refresh
      this.startRefreshTimer();
    } catch (error) {
      console.error('Initialization error:', error);
      this.showErrorMessage('Failed to initialize application. Please try refreshing the page.');
    } finally {
      // Hide loading state
      this.state.setLoading(false);
    }
  }

  /**
   * Initialize the user interface with current data
   */
  initializeUI() {
    // Set up tabs
    this.tabController.initializeTabs();
    
    // Render transactions based on current state
    this.renderTransactions();
    
    // Initialize charts
    this.chartManager.initializeCharts(this.state.getData());
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Listen for state changes
    this.state.addEventListener('dataUpdated', () => this.renderTransactions());
    this.state.addEventListener('periodChanged', () => this.handlePeriodChange());
    
    // Listen for UI events
    document.querySelector('#refresh-button')?.addEventListener('click', () => this.refreshData());
    document.querySelector('#period-selector')?.addEventListener('change', (e) => {
      this.state.setPeriod(e.target.value);
    });

    // Handle tab changes
    this.tabController.addEventListener('tabChanged', (tabId) => this.handleTabChange(tabId));
  }

  /**
   * Render all transaction types
   */
  renderTransactions() {
    const data = this.state.getData();
    
    if (data.burns) {
      this.renderer.renderBurns(data.burns, '#burns-container');
    }
    
    if (data.craftings) {
      this.renderer.renderCrafts(data.craftings, '#crafts-container');
    }
    
    if (data.trades) {
      this.renderer.renderTrades(data.trades, '#trades-container');
    }
    
    if (data.morphs) {
      this.renderer.renderMorphs(data.morphs, '#morphs-container');
    }
    
    // Update statistics
    this.updateStatistics(data);
  }

  /**
   * Update statistics displays
   */
  updateStatistics(data) {
    document.querySelector('#total-burns')?.textContent = formatters.formatNumber(data.burns?.length || 0);
    document.querySelector('#total-crafts')?.textContent = formatters.formatNumber(data.craftings?.length || 0);
    document.querySelector('#total-trades')?.textContent = formatters.formatNumber(data.trades?.length || 0);
    document.querySelector('#total-morphs')?.textContent = formatters.formatNumber(data.morphs?.length || 0);
    
    // Update last refresh time
    document.querySelector('#last-updated')?.textContent = formatters.formatDateTime(new Date());
  }

  /**
   * Handle period change
   */
  handlePeriodChange() {
    this.refreshData();
  }

  /**
   * Handle tab change
   */
  handleTabChange(tabId) {
    // Update charts if needed
    if (tabId === 'charts-tab') {
      this.chartManager.updateCharts(this.state.getData());
    }
  }

  /**
   * Refresh all data
   */
  async refreshData() {
    this.state.setLoading(true);
    
    try {
      const data = await this.dataManager.fetchAllData(this.state.getPeriod());
      this.state.updateData(data);
    } catch (error) {
      console.error('Data refresh error:', error);
      this.showErrorMessage('Failed to refresh data. Please try again.');
    } finally {
      this.state.setLoading(false);
    }
  }

  /**
   * Start the auto-refresh timer
   */
  startRefreshTimer() {
    // Refresh every 5 minutes
    const REFRESH_INTERVAL = 5 * 60 * 1000;
    
    setInterval(() => {
      this.refreshData();
    }, REFRESH_INTERVAL);
  }

  /**
   * Show error message to user
   */
  showErrorMessage(message) {
    const errorContainer = document.querySelector('#error-container');
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.classList.remove('d-none');
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        errorContainer.classList.add('d-none');
      }, 10000);
    } else {
      alert(message);
    }
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new AppCore();
  app.init();
});

export { AppCore };