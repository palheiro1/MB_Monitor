/**
 * Mythical Beings Monitor - Main Application
 */

import { renderCraftCards } from './components/transactions/crafts.js';
import { renderBurnCards } from './components/transactions/burns.js';
import { formatTimeAgo, formatDate } from './utils/formatters.js';

// Configuration
const config = {
  apiUrl: '/api',
  refreshInterval: 60000  // 1 minute
};

// Application state
const appState = {
  currentPeriod: '30d',
  isLoading: false
};

// DOM Elements
const elements = {
  burnCounter: document.getElementById('card-burns'),
  tradeCounter: document.getElementById('total-trades'),
  craftCounter: document.getElementById('card-crafts'),
  burnCardsContainer: document.getElementById('burns-cards'),
  tradeCardsContainer: document.getElementById('ardor-trades-cards'),
  craftCardsContainer: document.getElementById('crafts-cards'),
  statusBadge: document.getElementById('status-badge'),
  lastUpdate: document.getElementById('last-update'),
  refreshButton: document.getElementById('refresh-btn'),
  loadingOverlay: document.getElementById('loading-overlay')
};

// Templates
const templates = {
  burnCard: document.getElementById('burn-card-template'),
  tradeCard: document.getElementById('trade-card-template'),
  craftCard: document.getElementById('craft-card-template')
};

// Active tabs tracking
let activeTabs = {
  burns: true,
  trades: false,
  crafts: false
};

/**
 * Fetch data from API
 * @param {string} endpoint - API endpoint
 */
async function fetchData(endpoint) {
  try {
    console.log(`Fetching from: ${config.apiUrl}/${endpoint}`);
    const response = await fetch(`${config.apiUrl}/${endpoint}`);
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    // First try to parse as JSON
    try {
      const data = await response.json();
      console.log(`Data fetched from ${endpoint}:`, data);
      return data;
    } catch (parseError) {
      // If JSON parsing fails, get the text and log it for debugging
      const text = await response.text();
      console.error(`Failed to parse JSON for ${endpoint}. Response text:`, text);
      throw new Error(`Invalid JSON response: ${parseError.message}`);
    }
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return null;
  }
}

/**
 * Format date for display
 * @param {string|number} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  if (!date) return 'Unknown';
  
  try {
    // Convert Ardor timestamp if needed
    if (typeof date === 'number' && date < 1e10) {
      // Likely an Ardor timestamp (seconds since Ardor epoch)
      const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();
      date = new Date(ARDOR_EPOCH + (date * 1000));
    } else {
      date = new Date(date);
    }
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

/**
 * Format time ago for display
 * @param {string|number} date - Date to format
 * @returns {string} - Time ago string
 */
function timeAgo(date) {
  if (!date) return 'Unknown';
  
  try {
    let past;
    
    // Convert Ardor timestamp if needed
    if (typeof date === 'number' && date < 1e10) {
      // Likely an Ardor timestamp (seconds since Ardor epoch)
      const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();
      past = new Date(ARDOR_EPOCH + (date * 1000));
    } else {
      past = new Date(date);
    }
    
    const now = new Date();
    const seconds = Math.floor((now - past) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  } catch (error) {
    console.error('Error calculating time ago:', error);
    return 'Unknown time';
  }
}

/**
 * Format price for display
 * @param {number|string} price - Price to format
 * @param {string} currency - Currency code
 * @returns {string} - Formatted price
 */
function formatPrice(price, currency = 'IGNIS') {
  if (!price && price !== 0) return 'Unknown';
  
  // For IGNIS, show no decimal places (round to whole number)
  if (currency === 'IGNIS') {
    return `${Math.round(parseFloat(price))} ${currency}`;
  }
  
  // For other currencies, show 2 decimal places
  return `${parseFloat(price).toFixed(2)} ${currency}`;
}

/**
 * Format address for display
 * @param {string} address - Blockchain address
 * @returns {string} - Shortened address
 */
function formatAddress(address) {
  if (!address) return 'Unknown';
  if (address.length <= 14) return address;
  return address.substring(0, 6) + '...' + address.substring(address.length - 6);
}

/**
 * Show loading overlay
 */
function showLoading() {
  if (elements.loadingOverlay) {
    elements.loadingOverlay.style.display = 'flex';
  }
}

/**
 * Hide loading overlay
 */
function hideLoading() {
  if (elements.loadingOverlay) {
    elements.loadingOverlay.style.display = 'none';
  }
}

/**
 * Show loading overlay - alias for showLoading for consistency across code
 */
function showLoadingOverlay() {
  showLoading();
}

/**
 * Hide loading overlay - alias for hideLoading for consistency across code
 */
function hideLoadingOverlay() {
  hideLoading();
}

/**
 * Update last updated time
 */
function updateLastUpdatedTime() {
  if (elements.lastUpdate) {
    elements.lastUpdate.textContent = formatDate(new Date());
  }
}

// Add this function to avoid the reference error
function updateLastUpdateTime() {
  updateLastUpdatedTime();
}

/**
 * Get current period from active period selector
 * @returns {string} Current period (24h, 7d, 30d, all)
 */
function getCurrentPeriod() {
  const activeButton = document.querySelector('.period-selector.active');
  return activeButton ? activeButton.dataset.period : '30d'; // Default to 30d
}

/**
 * Get API base URL
 * @returns {string} API base URL
 */
function getApiBaseUrl() {
  return config.apiUrl;
}

/**
 * Format a number for display
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
  return num.toLocaleString();
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
  console.error(message);
  
  // Update status badge to show error
  if (elements.statusBadge) {
    elements.statusBadge.className = 'badge rounded-pill bg-danger me-2';
    elements.statusBadge.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i> Error';
  }
  
  // Create and show an error toast if toast container exists
  const toastContainer = document.getElementById('toast-container');
  if (toastContainer) {
    const toastId = 'error-' + Date.now();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
      <div class="toast-header bg-danger text-white">
        <i class="fas fa-exclamation-circle me-2"></i>
        <strong class="me-auto">Error</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    `;
    toastContainer.appendChild(toast);
    
    // Initialize and show the toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove after hiding
    toast.addEventListener('hidden.bs.toast', () => {
      toast.remove();
    });
  }
}

/**
 * Calculate total number of cards burned
 * @param {Array} burns - Array of burn objects
 * @returns {number} - Total number of cards burned
 */
function calculateTotalCardsBurned(burns) {
  if (!burns || !Array.isArray(burns)) return 0;
  
  return burns.reduce((total, burn) => {
    // Parse the quantity as an integer - it might be stored as a string in the JSON
    const quantity = parseInt(burn.quantityQNT || '1', 10);
    return total + quantity;
  }, 0);
}

/**
 * Display burns data in the UI
 * @param {Array} burns - Array of burn objects
 */
function displayCardBurns(burns) {
  console.log("Displaying card burns:", burns);
  
  if (!burns || !burns.length) {
    console.log("No burn data to display");
    return;
  }
  
  // Make sure we have the container
  if (!elements.burnCardsContainer) {
    console.error("Burns container not found");
    return;
  }
  
  // Make sure we have the template
  if (!templates.burnCard) {
    console.error("Burn card template not found");
    return;
  }
  
  // Clear existing cards
  elements.burnCardsContainer.innerHTML = '';
  
  // Sort burns by timestamp (newest first)
  const sortedBurns = [...burns].sort((a, b) => {
    const dateA = new Date(a.burnDate || a.timestamp * 1000);
    const dateB = new Date(b.burnDate || b.timestamp * 1000);
    return dateB - dateA;
  });
  
  // Display each burn
  sortedBurns.forEach((burn, index) => {
    console.log(`Creating burn card ${index + 1}:`, burn);
    
    try {
      // Clone the template
      const card = templates.burnCard.content.cloneNode(true);
      
      // Fill in data
      const cardNameElement = card.querySelector('.card-name');
      if (cardNameElement) {
        cardNameElement.textContent = burn.assetName || 'Unknown Card';
      }
      
      const timeElement = card.querySelector('.transaction-time');
      if (timeElement) {
        const burnDate = burn.burnDate || (burn.timestamp ? new Date(burn.timestamp * 1000) : null);
        timeElement.textContent = timeAgo(burnDate);
        timeElement.title = formatDate(burnDate);
      }
      
      const burnerElement = card.querySelector('.burner-name');
      if (burnerElement) {
        burnerElement.textContent = burn.senderRS || 'Unknown';
      }
      
      // Find amount element - handle different DOM structures
      let amountElement = card.querySelector('.burn-amount .amount');
      if (!amountElement) {
        amountElement = card.querySelector('.amount');
      }
      
      if (amountElement) {
        amountElement.textContent = burn.quantityFormatted || burn.quantityQNT || '1';
      }
      
      // Add the card to the container
      elements.burnCardsContainer.appendChild(card);
    } catch (error) {
      console.error("Error creating burn card:", error);
    }
  });
}

/**
 * Display trades data in the UI
 * @param {Array} trades - Array of trade objects
 */
function displayTrades(trades) {
  console.log("Displaying trades:", trades);
  
  // Get the total trades count from the page URL's search parameters if available
  const urlParams = new URLSearchParams(window.location.search);
  const totalTradesCount = parseInt(urlParams.get('totalTrades'), 10) || trades?.length || 0;
  
  if (!trades || !trades.length) {
    console.log("No trade data to display");
    if (elements.tradeCardsContainer) {
      elements.tradeCardsContainer.innerHTML = `
        <div class="text-center p-4 text-muted">
          No trades found
        </div>
      `;
    }
    return;
  }
  
  // Make sure we have the container
  if (!elements.tradeCardsContainer) {
    console.error("Trades container not found");
    return;
  }
  
  // Make sure we have the template
  if (!templates.tradeCard) {
    console.error("Trade card template not found");
    return;
  }
  
  // Clear existing cards
  elements.tradeCardsContainer.innerHTML = '';
  
  // Sort trades by timestamp (newest first)
  const sortedTrades = [...trades].sort((a, b) => {
    const timeA = a.timestamp || new Date(a.timestampISO).getTime() / 1000;
    const timeB = b.timestamp || new Date(b.timestampISO).getTime() / 1000;
    return timeB - timeA;
  });
  
  // Display each trade - limit to first 50 for performance
  const displayTrades = sortedTrades.slice(0, 50);
  displayTrades.forEach((trade, index) => {
    console.log(`Creating trade card ${index + 1}:`, trade);
    
    try {
      // Clone the template
      const card = templates.tradeCard.content.cloneNode(true);
      
      // Fill in data
      const cardNameElement = card.querySelector('.card-name');
      if (cardNameElement) {
        cardNameElement.textContent = trade.card_name || 'Unknown Card';
      }
      
      const timeElement = card.querySelector('.transaction-time');
      if (timeElement) {
        const tradeDate = trade.timestampISO || (trade.timestamp ? new Date(trade.timestamp * 1000) : null);
        timeElement.textContent = timeAgo(tradeDate);
        timeElement.title = formatDate(tradeDate);
      }
      
      const buyerElement = card.querySelector('.buyer-name');
      if (buyerElement) {
        buyerElement.textContent = formatAddress(trade.buyer || 'Unknown');
      }
      
      const sellerElement = card.querySelector('.seller-name');
      if (sellerElement) {
        sellerElement.textContent = formatAddress(trade.seller || 'Unknown');
      }
      
      const priceElement = card.querySelector('.price');
      if (priceElement) {
        // Get price - try direct price field first, then check raw data if available
        let tradePrice = trade.price;
        if ((!tradePrice && tradePrice !== 0) && trade.raw_data && trade.raw_data.priceNQTPerShare) {
          // Convert NQT price to IGNIS
          tradePrice = parseInt(trade.raw_data.priceNQTPerShare) / 100000000;
        }
        
        // Get quantity
        const quantity = trade.quantity || trade.raw_data?.quantityQNT || 1;
        
        // Format display with both price and quantity
        if (quantity > 1) {
          priceElement.textContent = `${formatPrice(tradePrice, trade.currency)} × ${quantity}`;
        } else {
          priceElement.textContent = formatPrice(tradePrice, trade.currency);
        }
      }
      
      // Add the card to the container
      elements.tradeCardsContainer.appendChild(card);
    } catch (error) {
      console.error("Error creating trade card:", error);
    }
  });
  
  // Add note if more trades available
  if (sortedTrades.length > 50) {
    const moreInfo = document.createElement('div');
    moreInfo.className = 'text-center p-3 text-muted';
    moreInfo.textContent = `Showing 50 of ${sortedTrades.length} trades`;
    elements.tradeCardsContainer.appendChild(moreInfo);
  }
  
  // Update the trade counter with complete info
  if (elements.tradeCounter && totalTradesCount > sortedTrades.length) {
    elements.tradeCounter.textContent = `${sortedTrades.length}/${totalTradesCount}`;
    elements.tradeCounter.title = `Showing ${sortedTrades.length} trades in selected period out of ${totalTradesCount} total trades`;
  }
}

/**
 * Display crafting data in the UI
 * @param {Array} craftings - Array of crafting objects
 */
function displayCraftings(craftings) {
  console.log("Displaying craftings:", craftings);
  
  if (!craftings || !craftings.length) {
    console.log("No crafting data to display");
    if (elements.craftCardsContainer) {
      elements.craftCardsContainer.innerHTML = `
        <div class="text-center p-4 text-muted">
          No crafting operations found
        </div>
      `;
    }
    return;
  }
  
  // Make sure we have the container
  if (!elements.craftCardsContainer) {
    console.error("Crafts container not found");
    return;
  }
  
  // Make sure we have the template
  if (!templates.craftCard) {
    console.error("Craft card template not found");
    return;
  }
  
  // Clear existing cards
  elements.craftCardsContainer.innerHTML = '';
  
  // Sort crafts by timestamp (newest first)
  const sortedCraftings = [...craftings].sort((a, b) => {
    return b.timestamp - a.timestamp;
  });
  
  // Display each crafting - limit to first 50 for performance
  const displayCraftings = sortedCraftings.slice(0, 50);
  displayCraftings.forEach((craft, index) => {
    console.log(`Creating craft card ${index + 1}:`, craft);
    
    try {
      // Clone the template
      const card = templates.craftCard.content.cloneNode(true);
      
      // Fill in data
      const cardNameElement = card.querySelector('.card-name');
      if (cardNameElement) {
        cardNameElement.textContent = craft.cardName || craft.assetName || 'Unknown Card';
      }
      
      const timeElement = card.querySelector('.transaction-time');
      if (timeElement) {
        // Handle different date formats
        let craftDate;
        if (craft.date) {
          craftDate = craft.date;
        } else if (craft.timestamp) {
          // Handle Ardor timestamp (seconds since Ardor epoch)
          const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();
          craftDate = new Date(ARDOR_EPOCH + (craft.timestamp * 1000));
        }
        
        timeElement.textContent = timeAgo(craftDate);
        timeElement.title = formatDate(craftDate);
      }
      
      const crafterElement = card.querySelector('.crafter-name');
      if (crafterElement) {
        crafterElement.textContent = formatAddress(craft.recipient || 'Unknown');
      }
      
      const craftResultElement = card.querySelector('.craft-result');
      if (craftResultElement) {
        craftResultElement.textContent = craft.cardName || craft.assetName || 'Unknown Card';
      }
      
      // Add the card to the container
      elements.craftCardsContainer.appendChild(card);
    } catch (error) {
      console.error("Error creating craft card:", error);
    }
  });
  
  // Add note if more craftings available
  if (sortedCraftings.length > 50) {
    const moreInfo = document.createElement('div');
    moreInfo.className = 'text-center p-3 text-muted';
    moreInfo.textContent = `Showing 50 of ${sortedCraftings.length} crafting operations`;
    elements.craftCardsContainer.appendChild(moreInfo);
  }
}

/**
 * Update the burn counter in the UI
 * @param {number} count - Number of burns
 */
function updateBurnsCounter(count) {
  console.log("Updating burns counter to:", count);
  if (elements.burnCounter) {
    elements.burnCounter.textContent = count;
  }
}

/**
 * Update the trade counter in the UI
 * @param {object} counts - Object containing count information
 */
function updateTradesCounter(counts) {
  console.log("Updating trades counter to:", counts);
  if (elements.tradeCounter) {
    // Show total count, no filtering
    const totalCount = counts.ardorTrades + counts.polygonTrades;
    elements.tradeCounter.textContent = totalCount;
  }
}

/**
 * Update the craft counter in the UI
 * @param {number} count - Number of crafts
 */
function updateCraftsCounter(count) {
  console.log("Updating crafts counter to:", count);
  if (elements.craftCounter) {
    elements.craftCounter.textContent = count;
  }
}

/**
 * Load card burns data
 */
async function loadCardBurns() {
  console.log("Loading card burns data");
  showLoading();
  
  try {
    // First try to get direct data from cache file
    console.log("Fetching card burns directly");
    const cardBurns = await fetchData('cache/file/ardor_card_burns');
    
    if (cardBurns && cardBurns.status === 'success' && cardBurns.data && cardBurns.data.burns) {
      const burns = cardBurns.data.burns;
      console.log(`Found ${burns.length} card burn transactions with total ${calculateTotalCardsBurned(burns)} cards`);
      displayCardBurns(burns);
      updateBurnsCounter(calculateTotalCardsBurned(burns)); // Use the total count instead of transaction count
      updateLastUpdatedTime();
    } else {
      // If direct fetch fails, try through cache status
      console.log("Direct fetch failed, trying cache status");
      const cacheStats = await fetchData('cache/status');
      
      if (cacheStats && cacheStats.files) {
        // Look for burn data in files
        const cardBurnsFile = cacheStats.files.find(f => f.filename === 'ardor_card_burns.json');
        
        if (cardBurnsFile && cardBurnsFile.data && cardBurnsFile.data.burns) {
          const burns = cardBurnsFile.data.burns;
          console.log(`Found ${burns.length} card burn transactions in cache stats with total ${calculateTotalCardsBurned(burns)} cards`);
          displayCardBurns(burns);
          updateBurnsCounter(calculateTotalCardsBurned(burns)); // Use the total count instead of transaction count
          updateLastUpdatedTime();
        } else {
          console.error("No burn data found in cache stats");
        }
      }
    }
  } catch (error) {
    console.error("Error loading card burns:", error);
  } finally {
    hideLoading();
  }
}

/**
 * Load Ardor trades data
 */
async function loadArdorTrades() {
  try {
    showLoading('ardorTrades');
    
    // Use 'all' as the default period instead of '30d'
    const period = getCurrentPeriod();
    console.log(`Loading Ardor trades with period: ${period}`);
    
    const url = `${getApiBaseUrl()}/trades/ardor?period=${period}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to load trades: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.ardor_trades) {
      console.error('Invalid Ardor trades data');
      showErrorMessage('Failed to load Ardor trades');
      return;
    }
    
    // Display trades data
    displayTrades(data.ardor_trades);
    
    // Update trades counter with the full count
    if (elements.tradeCounter) {
      elements.tradeCounter.textContent = data.count || data.ardor_trades.length;
    }
    
    console.log(`Loaded ${data.ardor_trades.length} Ardor trades`);
    
    // Update last update time
    updateLastUpdatedTime();
  } catch (error) {
    console.error('Error loading Ardor trades:', error);
    showErrorMessage('Error loading trades: ' + error.message);
  } finally {
    hideLoading();
  }
}

/**
 * Load Ardor crafting operations from API
 * @param {boolean} showLoading - Whether to show loading indicator
 */
async function loadArdorCraftings(showLoading = true) {
  try {
    if (showLoading) {
      showLoadingOverlay();
    }
    
    const period = getCurrentPeriod();
    console.log(`Loading Ardor crafting operations for period: ${period}`);
    
    const response = await fetch(`${getApiBaseUrl()}/crafts?period=${period}`);
    if (!response.ok) {
      throw new Error(`Failed to load crafting data: ${response.statusText}`);
    }
    
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Error parsing crafting data JSON:', parseError);
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      throw new Error('Invalid JSON response from crafting API');
    }
    
    if (!data || !data.craftings || !Array.isArray(data.craftings)) {
      console.error('Invalid crafting data format received from API:', data);
      if (showLoading) hideLoadingOverlay();
      return;
    }
    
    console.log(`Loaded ${data.craftings.length} crafting operations`);
    
    // Clear the container first
    if (elements.craftCardsContainer) {
      elements.craftCardsContainer.innerHTML = '';
      
      if (data.craftings.length === 0) {
        elements.craftCardsContainer.innerHTML = '<div class="empty-state">No crafting operations found for the selected period</div>';
      } else {
        // Use the imported renderCraftCards function with the right parameters
        renderCraftCards(elements.craftCardsContainer, data.craftings, { animateEntrance: false });
      }
    }
    
    // Update summary stats if available
    if (data.count !== undefined && elements.craftCounter) {
      elements.craftCounter.textContent = formatNumber(data.count);
    }
    
    // Update last update time
    updateLastUpdatedTime(); // Use the corrected function name here
    
  } catch (error) {
    console.error('Error loading crafting data:', error);
  } finally {
    if (showLoading) {
      hideLoadingOverlay();
    }
  }
}

/**
 * Filter trades by period
 * @param {Array} trades - All trades
 * @param {string} period - Period filter (24h, 7d, 30d, all)
 * @returns {Array} - Filtered trades
 */
function filterTradesByPeriod(trades, period) {
  if (!trades || !Array.isArray(trades)) return [];
  if (period === 'all') return trades;
  
  const now = Date.now();
  const cutoffs = {
    '24h': now - (24 * 60 * 60 * 1000),
    '7d': now - (7 * 24 * 60 * 60 * 1000),
    '30d': now - (30 * 24 * 60 * 60 * 1000)
  };
  
  const cutoff = cutoffs[period] || cutoffs['30d'];
  
  return trades.filter(trade => {
    // Handle different timestamp formats
    let timestamp;
    if (trade.timestampISO) {
      timestamp = new Date(trade.timestampISO).getTime();
    } else if (trade.timestamp) {
      // Ardor uses seconds, convert to milliseconds
      timestamp = trade.timestamp * 1000;
    } else {
      return false;
    }
    
    return timestamp >= cutoff;
  });
}

/**
 * Get count of all transactions by type, including total counts
 * @returns {Object} Count information
 */
function getTransactionTotalCounts() {
  const tradesData = getState('currentData.tradesData') || {};
  const giftzData = getState('currentData.giftzData') || {};
  const craftsData = getState('currentData.craftsData') || {};
  const morphsData = getState('currentData.morphsData') || {};
  const burnsData = getState('currentData.burnsData') || {};
  
  return {
    ardorTrades: (tradesData.ardor_trades || []).length,
    ardorTradesTotal: tradesData.ardor_trades_total || (tradesData.ardor_trades || []).length,
    polygonTrades: (tradesData.polygon_trades || []).length,
    giftzSales: (giftzData.sales || []).length,
    crafts: (craftsData.crafts || []).length,
    morphs: (morphsData.morphs || []).length,
    burns: (burnsData.burns || []).length
  };
}

/**
 * Get the selected period for a tab
 * @param {string} tabId - The tab ID
 * @returns {string} - The selected period
 */
function getSelectedPeriod(tabId) {
  const selector = document.querySelector(`.period-filter[data-target="${tabId}"]`);
  return selector ? selector.value : '30d'; // Default to 30d if no selector found
}

/**
 * Load all data
 */
async function loadAllData() {
  showLoading();
  
  try {
    // Load all data types in parallel
    await Promise.all([
      loadCardBurns(),
      loadArdorTrades(),
      loadArdorCraftings()
    ]);
    updateLastUpdatedTime();
  } catch (error) {
    console.error("Error loading all data:", error);
  } finally {
    hideLoading();
  }
}

/**
 * Setup tab click handlers
 */
function setupTabHandlers() {
  // Monitor tab changes
  const tabs = document.querySelectorAll('[data-bs-toggle="tab"]');
  tabs.forEach(tab => {
    tab.addEventListener('shown.bs.tab', event => {
      const targetId = event.target.getAttribute('data-bs-target');
      
      // Track which tab is active
      activeTabs.burns = targetId === '#burns-content';
      activeTabs.trades = targetId === '#ardor-trades-content';
      activeTabs.crafts = targetId === '#crafts-content';
      console.log(`Tab changed to ${targetId}`);
      
      // If switching to trades tab, make sure trades are loaded
      if (targetId === '#ardor-trades-content' && elements.tradeCardsContainer) {
        if (elements.tradeCardsContainer.children.length === 0) {
          console.log('Loading trades for empty trades tab');
          loadArdorTrades();
        }
      }
      
      // If switching to burns tab, make sure burns are loaded
      if (targetId === '#burns-content' && elements.burnCardsContainer) {
        if (elements.burnCardsContainer.children.length === 0) {
          console.log('Loading burns for empty burns tab');
          loadCardBurns();
        }
      }
      
      // If switching to crafts tab, make sure crafts are loaded
      if (targetId === '#crafts-content' && elements.craftCardsContainer) {
        if (elements.craftCardsContainer.children.length === 0) {
          console.log('Loading crafts for empty crafts tab');
          loadArdorCraftings();
        }
      }
    });
  });
  
  // Setup period selector buttons
  const periodButtons = document.querySelectorAll('.period-selector');
  periodButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Update button states
      periodButtons.forEach(btn => btn.classList.remove('active', 'btn-primary'));
      periodButtons.forEach(btn => btn.classList.add('btn-outline-primary'));
      button.classList.remove('btn-outline-primary');
      button.classList.add('active', 'btn-primary');
      
      // Reload data with new period
      const period = button.dataset.period;
      console.log(`Period changed to ${period}`);
      
      // Reload trades data with new period if trades tab is active
      if (activeTabs.trades) {
        loadArdorTrades();
      }
    });
  });
}

/**
 * Initialize the application
 */
function init() {
  console.log("Initializing MB Monitor");
  
  // Setup tab handlers
  setupTabHandlers();
  
  // Setup refresh button
  if (elements.refreshButton) {
    elements.refreshButton.addEventListener('click', () => {
      // Reload data based on the tab
      if (activeTabs.burns) {
        loadCardBurns();
      } else if (activeTabs.trades) {
        loadArdorTrades();
      } else if (activeTabs.crafts) {
        loadArdorCraftings();
      } else {
        loadAllData();
      }
    });
  }
  
  // Initial data load
  loadAllData();
  
  // Setup refresh interval
  if (config.refreshInterval > 0) {
    setInterval(() => {
      // Only refresh the active tab's data
      if (activeTabs.burns) {
        loadCardBurns();
      } else if (activeTabs.trades) {
        loadArdorTrades();
      } else if (activeTabs.crafts) {
        loadArdorCraftings();
      }
    }, config.refreshInterval);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

/**
 * Load and initialize transactions data
 */
async function initTransactionsData() {
  try {
    // ...existing code...
    
    // Get trades data
    await getTradesData();
    
    // Add explicit call to get crafting data - this may be missing
    console.log("Attempting to load crafting data...");
    await getCraftingsData();
    
    // Get burns data
    await getBurnsData();
    
    // ...existing code...
  } catch (error) {
    console.error("Error initializing transaction data:", error);
  }
}

/**
 * Load craftings data from API
 */
async function getCraftingsData() {
  try {
    console.log("Fetching craftings data...");
    const craftings = await getCraftings();
    console.log("Craftings data received:", craftings);
    
    if (craftings && Array.isArray(craftings.ardor_craftings)) {
      // Find new items for animation
      const newItemIds = findNewCraftings(getState('craftings'), craftings.ardor_craftings);
      
      // Update state
      setState('craftings', craftings.ardor_craftings);
      setState('craftingsTimestamp', craftings.timestamp);
      
      // Render craftings
      renderCraftingCards(
        craftings.ardor_craftings, 
        document.getElementById('crafts-container'),
        newItemIds
      );
    } else {
      console.error("Invalid craftings data structure:", craftings);
    }
  } catch (error) {
    console.error("Error loading craftings data:", error);
  }
}
