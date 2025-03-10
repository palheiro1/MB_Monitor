/**
 * UI Updater
 * 
 * Connects UI components to data updates.
 * Handles rendering when data changes.
 */

import { onDataEvent } from '../data-manager/index.js';
import { getState } from '../state/index.js';
import { showLoading, hideLoading, updateStatusBadge } from './ui-manager.js';
import { renderTradeCards } from './transactions/trades.js';
import { renderCraftCards } from './transactions/crafts.js';
import { renderBurnCards } from './transactions/burns.js';
import { renderCacheTable } from './cache-table.js';
import { updateCharts } from './charts.js';
import { checkForNewActivity } from './activity-monitor.js';

/**
 * Initialize UI updater
 * Connects data events to UI rendering functions
 */
export function initUIUpdater() {
  // Handle loading events
  onDataEvent('data-loading', () => {
    showLoading();
    updateStatusBadge('loading');
  });
  
  onDataEvent('data-loading-finished', () => {
    hideLoading();
  });
  
  // Handle data loaded event
  onDataEvent('data-loaded', (event) => {
    // Update status badge
    updateStatusBadge('success');
    
    // Update all UI components
    updateAllComponents();
    
    // Check for new activity
    checkForNewActivity();
    
    // Update last update time in UI
    updateLastUpdateTime();
  });
  
  // Handle data error event
  onDataEvent('data-error', (event) => {
    updateStatusBadge('error');
    hideLoading();
  });
  
  console.log('UI updater initialized');
}

/**
 * Update all UI components with current data
 */
export function updateAllComponents() {
  // Get container elements
  const tradeCardsElement = document.getElementById('ardor-trades-cards');
  const craftCardsElement = document.getElementById('crafts-cards');
  const burnCardsElement = document.getElementById('burns-cards');
  
  // Get current data
  const tradesData = getState('currentData.tradesData');
  const craftsData = getState('currentData.craftsData');
  const burnsData = getState('currentData.burnsData');
  
  // Render cards if containers exist
  if (tradeCardsElement && tradesData?.ardor_trades) {
    renderTradeCards(tradesData.ardor_trades, tradeCardsElement);
  }
  
  if (craftCardsElement && craftsData?.craftings) {
    renderCraftCards(craftCardsElement, craftsData.craftings);
  }
  
  if (burnCardsElement && burnsData?.burns) {
    renderBurnCards(burnCardsElement, burnsData.burns);
  }
  
  // Update cache table
  renderCacheTable();
  
  // Update charts with new data
  updateCharts();
  
  // Update summary counters
  updateCounters();
}

/**
 * Update summary counters in the UI
 */
function updateCounters() {
  const tradesData = getState('currentData.tradesData');
  const craftsData = getState('currentData.craftsData');
  const burnsData = getState('currentData.burnsData');
  
  // Update trade counter
  const tradeCounter = document.getElementById('total-trades');
  if (tradeCounter && tradesData) {
    const count = tradesData.count || (tradesData.ardor_trades?.length || 0);
    tradeCounter.textContent = count.toLocaleString();
  }
  
  // Update craft counter
  const craftCounter = document.getElementById('card-crafts');
  if (craftCounter && craftsData) {
    const count = craftsData.count || (craftsData.craftings?.length || 0);
    craftCounter.textContent = count.toLocaleString();
  }
  
  // Update burn counter
  const burnCounter = document.getElementById('card-burns');
  if (burnCounter && burnsData) {
    const count = burnsData.count || (burnsData.burns?.length || 0);
    burnCounter.textContent = count.toLocaleString();
  }
}

/**
 * Update the last update time display
 */
function updateLastUpdateTime() {
  const lastUpdateElement = document.getElementById('last-update');
  if (lastUpdateElement) {
    const now = new Date();
    lastUpdateElement.textContent = now.toLocaleString();
  }
}
