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
      ardorService.getTrades(period),
      ardorService.getCardBurns(false, period),
      ardorService.getCraftings(false, period),
      ardorService.getMorphings(false, period),
      ardorService.getGiftzSales(false, period)
    ]);
    
    // Process data for activity charts - pass the period parameter
    const activityData = processActivityData(
      tradesData, 
      burnsData, 
      craftsData, 
      morphsData, 
      giftzData, 
      startDate, 
      endDate,
      period // Pass the period parameter
    );
    
    // Add network distribution data
    activityData.network_distribution = {
      ardor: tradesData.ardor_trades?.length || 0,
      polygon: 0 // Placeholder for when polygon data is available
    };
    
    res.json(activityData);
  } catch (error) {
    console.error('Error generating activity data:', error);
    res.status(500).json({ 
      error: 'Failed to generate activity data',
      details: error.message
    });
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
 * @param {string} period - Selected time period
 * @returns {Object} Processed activity data
 */
function processActivityData(tradesData, burnsData, craftsData, morphsData, giftzData, startDate, endDate, period = 'all') {
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
  
  // Log total quantities available for each data type
  console.log('Activity data processing - quantities available:', {
    trades: tradesData?.totalQuantity || 'missing',
    burns: burnsData?.totalQuantity || 'missing',
    crafts: craftsData?.totalQuantity || 'missing',
    morphs: morphsData?.totalQuantity || 'missing',
    giftz: giftzData?.totalQuantity || 'missing'
  });

  // Process trades data - count quantities traded, not just operations
  if (tradesData && Array.isArray(tradesData.ardor_trades)) {
    tradesData.ardor_trades.forEach(trade => {
      const date = extractDate(trade.timestamp, trade.timestampISO);
      if (date && dateMap[date]) {
        // Extract quantity - prefer direct quantity field, fallback to quantityQNT in raw_data
        let tradeQuantity = 1; // Default to 1 if no quantity found
        
        if (trade.quantity) {
          tradeQuantity = parseInt(trade.quantity, 10);
        } else if (trade.raw_data && trade.raw_data.quantityQNT) {
          tradeQuantity = parseInt(trade.raw_data.quantityQNT, 10);
        }
        
        if (isNaN(tradeQuantity) || tradeQuantity <= 0) tradeQuantity = 1;
        
        dateMap[date].trades += tradeQuantity;
      }
    });
  }
  
  // Process burns data - count quantities burned, not just operations
  if (burnsData && Array.isArray(burnsData.burns)) {
    burnsData.burns.forEach(burn => {
      const date = extractDate(burn.timestamp, burn.timestampISO);
      if (date && dateMap[date]) {
        // Extract quantity from various possible fields
        let burnQuantity = 1; // Default to 1 if no quantity found
        
        if (burn.quantityQNT) {
          burnQuantity = parseInt(burn.quantityQNT, 10);
        } else if (burn.quantityFormatted) {
          burnQuantity = parseInt(burn.quantityFormatted, 10);
        } else if (burn.quantity) {
          burnQuantity = parseInt(burn.quantity, 10);
        }
        
        if (isNaN(burnQuantity) || burnQuantity <= 0) burnQuantity = 1;
        
        dateMap[date].burns += burnQuantity;
      }
    });
  }
  
  // Process crafts data - count cards used/crafted, not just operations
  if (craftsData) {
    // Handle different data structures
    const craftsArray = craftsData.craftings || craftsData.crafts || [];
    craftsArray.forEach(craft => {
      const date = extractDate(craft.timestamp, craft.timestampISO || craft.date);
      if (date && dateMap[date]) {
        // Extract quantity of cards used in crafting
        let cardsUsed = 1; // Default to 1 if not specified
        
        if (craft.cardsUsed) {
          cardsUsed = parseInt(craft.cardsUsed, 10);
        } else if (craft.details && craft.details.cardsUsed) {
          cardsUsed = parseInt(craft.details.cardsUsed, 10);
        }
        
        if (isNaN(cardsUsed) || cardsUsed <= 0) cardsUsed = 1;
        
        dateMap[date].crafts += cardsUsed;
      }
    });
  }
  
  // Process morphs data - count cards morphed, not just operations
  processMorphsData(morphsData, dateMap);
  
  // Process Giftz sales data - count quantity sold, not just sales
  if (giftzData && Array.isArray(giftzData.sales)) {
    giftzData.sales.forEach(sale => {
      const date = extractDate(sale.timestamp, sale.timestampISO);
      if (date && dateMap[date]) {
        // Extract quantity of items sold
        let saleQuantity = 1; // Default to 1 if no quantity found
        
        if (sale.quantity) {
          saleQuantity = parseInt(sale.quantity, 10);
        } else if (sale.quantityQNT) {
          saleQuantity = parseInt(sale.quantityQNT, 10);
        }
        
        if (isNaN(saleQuantity) || saleQuantity <= 0) saleQuantity = 1;
        
        dateMap[date].giftz += saleQuantity;
      }
    });
  }

  // Check if we should aggregate by month for 'all' period with large date ranges
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const shouldAggregateByMonth = period === 'all' && days > 90;
  
  let finalDateMap;
  
  if (shouldAggregateByMonth) {
    console.log(`Aggregating chart data by month for 'all' period (${days} days span)`);
    finalDateMap = aggregateByMonth(dateMap);
  } else {
    finalDateMap = dateMap;
  }
  
  // Convert the map to arrays for the chart
  const dateLabels = Object.keys(finalDateMap).sort();
  const trades = dateLabels.map(date => finalDateMap[date].trades);
  const burns = dateLabels.map(date => finalDateMap[date].burns);
  const crafts = dateLabels.map(date => finalDateMap[date].crafts);
  const morphs = dateLabels.map(date => finalDateMap[date].morphs);
  const giftz = dateLabels.map(date => finalDateMap[date].giftz);
  
  // Format date labels for display based on period and aggregation
  const displayLabels = formatLabelsForDisplay(dateLabels, startDate, endDate, shouldAggregateByMonth);
  
  return {
    labels: displayLabels,
    trades,
    burns, 
    crafts,
    morphs,
    giftz,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    aggregatedByMonth: shouldAggregateByMonth,
    assetQuantities: true, // Flag to indicate this is using asset quantities, not operation counts
    totalQuantities: {
      trades: tradesData?.totalQuantity || 0,
      burns: burnsData?.totalQuantity || 0,
      crafts: craftsData?.totalQuantity || 0,
      morphs: morphsData?.totalQuantity || 0,
      giftz: giftzData?.totalQuantity || 0
    }
  };
}

/**
 * Process morphs data - count cards morphed, not just operations
 * @param {Array} morphsData - Morphs data to process
 * @param {Object} dateMap - Map of dates to activity counts
 */
function processMorphsData(morphsData, dateMap) {
  if (morphsData && Array.isArray(morphsData.morphs)) {
    morphsData.morphs.forEach(morph => {
      const date = extractDate(morph.timestamp, morph.timestampISO);
      if (date && dateMap[date]) {
        // Extract quantity of cards used in morphing
        let morphQuantity = Number(morph.quantity || 1);
        
        if (isNaN(morphQuantity) || morphQuantity <= 0) morphQuantity = 1;
        
        dateMap[date].morphs += morphQuantity;
      }
    });
  }
}

/**
 * Aggregate daily data into monthly buckets
 * @param {Object} dailyDateMap - Map of daily data
 * @returns {Object} Map of monthly aggregated data
 */
function aggregateByMonth(dailyDateMap) {
  const monthlyMap = {};
  
  // Process each day's data
  Object.entries(dailyDateMap).forEach(([dateStr, data]) => {
    // Extract year and month (YYYY-MM format)
    const monthKey = dateStr.substring(0, 7);
    
    // Initialize month entry if it doesn't exist
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = {
        date: monthKey,
        trades: 0,
        burns: 0,
        crafts: 0,
        morphs: 0,
        giftz: 0
      };
    }
    
    // Add this day's counts to the monthly total
    monthlyMap[monthKey].trades += data.trades;
    monthlyMap[monthKey].burns += data.burns;
    monthlyMap[monthKey].crafts += data.crafts;
    monthlyMap[monthKey].morphs += data.morphs;
    monthlyMap[monthKey].giftz += data.giftz;
  });
  
  return monthlyMap;
}

/**
 * Format date labels for chart display
 * @param {Array} dateLabels - Array of YYYY-MM-DD or YYYY-MM date strings
 * @param {Date} startDate - Period start date
 * @param {Date} endDate - Period end date
 * @param {boolean} isMonthlyAggregated - Whether data is aggregated by month
 * @returns {Array} Formatted date labels
 */
function formatLabelsForDisplay(dateLabels, startDate, endDate, isMonthlyAggregated = false) {
  // If data is already aggregated by month, always use month/year format
  if (isMonthlyAggregated) {
    return dateLabels.map(date => {
      // Handle YYYY-MM format
      const year = date.substring(0, 4);
      const month = date.substring(5, 7);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = parseInt(month, 10) - 1;
      return `${monthNames[monthIndex]} ${year}`;
    });
  }

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
