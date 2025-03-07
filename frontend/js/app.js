/**
 * Mythical Beings Monitor - Simplified Version
 * This version focuses specifically on showing the burns data
 */

// Configuration
const config = {
  apiUrl: '/api',
  refreshInterval: 60000  // 1 minute
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

// Track active tab for refresh focus
let activeTabs = {
  burns: true,
  trades: false,
  crafts: false
};

/**
 * Fetch data from API
 * @param {string} endpoint - API endpoint
 * @returns {Promise<any>} - JSON data
 */
async function fetchData(endpoint) {
  console.log(`Fetching from: ${config.apiUrl}/${endpoint}`);
  
  try {
    const response = await fetch(`${config.apiUrl}/${endpoint}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`Data fetched from ${endpoint}:`, data);
    return data;
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
 * Update last updated time
 */
function updateLastUpdatedTime() {
  if (elements.lastUpdate) {
    elements.lastUpdate.textContent = formatDate(new Date());
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
    const period = 'all';
    console.log(`Loading Ardor trades with period: ${period}`);
    
    const url = `/api/trades/ardor?period=${period}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data || !data.ardor_trades) {
      console.error('Invalid Ardor trades data');
      showErrorMessage('ardorTrades', 'Failed to load Ardor trades');
      return;
    }
    
    // Store data
    const tradesData = getState('currentData.tradesData') || {};
    tradesData.ardor_trades = data.ardor_trades;
    setState('currentData.tradesData', tradesData);
    
    // Update display
    hideLoading('ardorTrades');
    renderTradeCards(data.ardor_trades, getElement('ardorTradesCards'), []);
    
    // Update trades counter with the full count
    if (elements.tradeCounter) {
      elements.tradeCounter.textContent = data.count;
    }
    
    console.log(`Loaded ${data.ardor_trades.length} Ardor trades`);
  } catch (error) {
    console.error('Error loading Ardor trades:', error);
    showErrorMessage('ardorTrades', 'Error loading trades');
  }
}

/**
 * Load Ardor craftings data
 */
async function loadArdorCraftings() {
  console.log("Loading Ardor craftings data");
  showLoading();
  
  try {
    // Add refresh parameter if needed
    const refreshParam = new URLSearchParams(window.location.search).get('refresh') === 'true' ? '?refresh=true' : '';
    
    console.log(`Fetching Ardor craftings with params: ${refreshParam}`);
    const craftingsResponse = await fetchData(`ardor/craftings${refreshParam}`);
    
    if (craftingsResponse && craftingsResponse.craftings) {
    // First try to get data from API
    console.log("Fetching Ardor craftings");
    const craftingsResponse = await fetchData('ardor/craftings');
    
    if (craftingsResponse && craftingsResponse.craftings) {
      console.log(`Found ${craftingsResponse.count} Ardor craftings`);
      displayCraftings(craftingsResponse.craftings);
      updateCraftsCounter(craftingsResponse.count);
      updateLastUpdatedTime();
    } else {
      // If API fetch fails, try through cache file
      console.log("API fetch failed, trying cache file");
      const cacheFile = await fetchData('cache/file/ardor_craftings');
      
      if (cacheFile && cacheFile.status === 'success' && cacheFile.data && cacheFile.data.craftings) {
        const craftings = cacheFile.data.craftings;
        
        console.log(`Found ${craftings.length} Ardor craftings in cache file`);
        displayCraftings(craftings);
        updateCraftsCounter(craftings.length);
        updateLastUpdatedTime();
      } else {
        console.error("No craftings data found in cache file");
        updateCraftsCounter(0);
        
        // Add no data message
        if (elements.craftCardsContainer) {
          elements.craftCardsContainer.innerHTML = `
            <div class="text-center p-4 text-muted">
              No crafting data available. Please try refreshing.
            </div>
          `;
        }
      }
    }
  } catch (error) {
    console.error("Error loading Ardor craftings:", error);
    updateCraftsCounter(0);
  } finally {
    hideLoading();
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
