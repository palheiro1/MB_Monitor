/**
 * Activity API Routes
 * Provides data for activity charts and visualizations
 */
const express = require('express');
const router = express.Router();
const ardorService = require('../services/ardorService');
const polygonService = require('../services/polygonService');

/**
 * Generate daily activity data for charts
 * @route GET /api/activity
 * @param {string} period - Time period (24h, 7d, 30d, all)
 */
router.get('/', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    console.log(`Processing activity data request for period: ${period}`);
    
    // Get date range based on period
    const { startDate, endDate, days } = getPeriodDateRange(period);
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()} (${days} days)`);
    
    // Fix function names to match what's actually exported by ardorService
    const [tradesData, burnsData, craftsData, morphsData, giftzData] = await Promise.all([
      ardorService.getTrades(false, period),       // Changed from getArdorTrades
      ardorService.getCardBurns(false, period),
      ardorService.getCraftings(false, period),    // This should be the correct name
      ardorService.getMorphings(false, period),
      ardorService.getGiftzSales(false, period)
    ]);
    
    // Process data into activity by date
    const activityData = processActivityData(
      tradesData, 
      burnsData, 
      craftsData,
      morphsData,
      giftzData,
      startDate, 
      endDate
    );
    
    res.json(activityData);
  } catch (error) {
    console.error('Error generating activity data:', error);
    res.status(500).json({ error: 'Failed to generate activity data' });
  }
});

/**
 * Get date range based on period
 * @param {string} period - Time period (24h, 7d, 30d, all)
 * @returns {Object} Start and end dates and number of days
 */
function getPeriodDateRange(period) {
  const endDate = new Date();
  let startDate;
  let days;
  
  switch (period) {
    case '24h':
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 1);
      days = 1;
      break;
    case '7d':
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 7);
      days = 7;
      break;
    case '30d':
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 30);
      days = 30;
      break;
    case 'all':
    default:
      // For 'all', go back to the beginning of 2023 or earlier if needed
      startDate = new Date('2023-01-01T00:00:00Z');
      days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      break;
  }
  
  return { startDate, endDate, days };
}

/**
 * Process activity data for charting
 * @param {Object} tradesData - Trades data
 * @param {Object} burnsData - Burns data
 * @param {Object} craftsData - Crafts data
 * @param {Object} morphsData - Morphs data
 * @param {Object} giftzData - Giftz sales data
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} Processed activity data
 */
function processActivityData(tradesData, burnsData, craftsData, morphsData, giftzData, startDate, endDate) {
  // Create a mapping of dates to daily activity counts
  const dateMap = {};
  
  // Generate all dates in range
  const allDates = generateDateRange(startDate, endDate);
  
  // Initialize the date map with zeros for all dates
  allDates.forEach(date => {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    dateMap[dateStr] = {
      date: dateStr,
      trades: 0,
      burns: 0,
      crafts: 0,
      morphs: 0,
      giftz: 0
    };
  });
  
  // Process trades data
  if (tradesData && Array.isArray(tradesData.ardor_trades)) {
    tradesData.ardor_trades.forEach(trade => {
      const date = extractDate(trade.timestamp, trade.timestampISO);
      if (date && dateMap[date]) {
        dateMap[date].trades++;
      }
    });
  }
  
  // Process burns data
  if (burnsData && Array.isArray(burnsData.burns)) {
    burnsData.burns.forEach(burn => {
      const date = extractDate(burn.timestamp, burn.timestampISO);
      if (date && dateMap[date]) {
        dateMap[date].burns++;
      }
    });
  }
  
  // Process crafts data
  if (craftsData) {
    // Handle different data structures
    const craftsArray = craftsData.craftings || craftsData.crafts || [];
    craftsArray.forEach(craft => {
      const date = extractDate(craft.timestamp, craft.timestampISO || craft.date);
      if (date && dateMap[date]) {
        dateMap[date].crafts++;
      }
    });
  }
  
  // Process morphs data
  if (morphsData && Array.isArray(morphsData.morphs)) {
    morphsData.morphs.forEach(morph => {
      const date = extractDate(morph.timestamp, morph.timestampISO);
      if (date && dateMap[date]) {
        dateMap[date].morphs++;
      }
    });
  }
  
  // Process Giftz sales data
  if (giftzData && Array.isArray(giftzData.sales)) {
    giftzData.sales.forEach(sale => {
      const date = extractDate(sale.timestamp, sale.timestampISO);
      if (date && dateMap[date]) {
        dateMap[date].giftz++;
      }
    });
  }
  
  // Convert the map to arrays for the chart
  const dateLabels = Object.keys(dateMap).sort();
  const trades = dateLabels.map(date => dateMap[date].trades);
  const burns = dateLabels.map(date => dateMap[date].burns);
  const crafts = dateLabels.map(date => dateMap[date].crafts);
  const morphs = dateLabels.map(date => dateMap[date].morphs);
  const giftz = dateLabels.map(date => dateMap[date].giftz);
  
  // Format date labels for display based on period
  const displayLabels = formatLabelsForDisplay(dateLabels, startDate, endDate);
  
  return {
    labels: displayLabels,
    trades,
    burns, 
    crafts,
    morphs,
    giftz,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
}

/**
 * Format date labels for chart display
 * @param {Array} dateLabels - Array of YYYY-MM-DD date strings
 * @param {Date} startDate - Period start date
 * @param {Date} endDate - Period end date
 * @returns {Array} Formatted date labels
 */
function formatLabelsForDisplay(dateLabels, startDate, endDate) {
  // Calculate date difference
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  // Use different formats based on range
  if (days <= 1) {
    // For 24h, show hours (00:00)
    return dateLabels.map(date => {
      const fullDate = new Date(date + 'T00:00:00Z');
      return fullDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
  } else if (days <= 7) {
    // For a week, show day of week (Mon, Tue)
    return dateLabels.map(date => {
      const fullDate = new Date(date + 'T00:00:00Z');
      return fullDate.toLocaleDateString([], { weekday: 'short' });
    });
  } else if (days <= 90) {
    // For up to 3 months, show month/day (Jan 1)
    return dateLabels.map(date => {
      const fullDate = new Date(date + 'T00:00:00Z');
      return fullDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    });
  } else {
    // For longer periods, show year/month (Jan 2023)
    return dateLabels.map(date => {
      const fullDate = new Date(date + 'T00:00:00Z');
      return fullDate.toLocaleDateString([], { month: 'short', year: 'numeric' });
    });
  }
}

/**
 * Generate an array of dates between start and end
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Array of date objects
 */
function generateDateRange(startDate, endDate) {
  const dates = [];
  const currentDate = new Date(startDate);
  
  // Set to start of day
  currentDate.setHours(0, 0, 0, 0);
  
  // Set end date to end of day
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  while (currentDate <= endOfDay) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

/**
 * Extract YYYY-MM-DD date from timestamp
 * @param {number} timestamp - Timestamp (seconds or ms)
 * @param {string} isoDate - ISO date string (fallback)
 * @returns {string} Date string in YYYY-MM-DD format
 */
function extractDate(timestamp, isoDate) {
  try {
    let date;
    
    // Try to get date from ISO string first
    if (isoDate) {
      date = new Date(isoDate);
    } 
    // Then try timestamp (check if it's Ardor timestamp or JS timestamp)
    else if (timestamp) {
      const ARDOR_EPOCH = new Date("2018-01-01T00:00:00Z").getTime();
      date = timestamp < 1e10 
        ? new Date(ARDOR_EPOCH + (timestamp * 1000)) // Ardor timestamp
        : new Date(timestamp); // JS timestamp
    } else {
      return null;
    }
    
    // Format as YYYY-MM-DD
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error extracting date:', error);
    return null;
  }
}

module.exports = router;
