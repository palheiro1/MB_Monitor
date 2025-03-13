/**
 * Unified API Router
 * 
 * Simplified API endpoints that use our unified blockchain service.
 * Provides consistent response formats and error handling.
 */

const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchainService');
const { readJSON } = require('../utils/jsonStorage');
const { filterByPeriod } = require('../utils/filters');

// Middleware for consistent error handling
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(err => {
    console.error(`API Error: ${req.path}`, err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  });
};

// Common period parameter parsing
function getPeriodParam(req) {
  return req.query.period || '30d';
}

// Health check endpoint
router.get('/ping', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is online',
    timestamp: new Date().toISOString()
  });
});

// Get all activity data (combined from multiple sources)
router.get('/activity', asyncHandler(async (req, res) => {
  const period = getPeriodParam(req);
  const forceRefresh = req.query.refresh === 'true';
  
  const data = await blockchainService.getAllData(period, forceRefresh);
  
  // Format activity timeline data
  const activityData = formatActivityTimeline(data);
  
  res.json({
    success: true,
    period,
    ...activityData,
    timestamp: new Date().toISOString()
  });
}));

// Helper to format timeline data
function formatActivityTimeline(data) {
  // Extract timeline data from all sources
  const trades = data.trades?.ardor_trades || [];
  const burns = data.burns?.burns || [];
  const crafts = data.craftings?.craftings || [];
  
  // Group activities by date
  const activityByDate = {};
  
  // Process trades
  trades.forEach(trade => {
    const date = new Date(trade.timestamp).toISOString().split('T')[0];
    if (!activityByDate[date]) {
      activityByDate[date] = { trades: 0, burns: 0, crafts: 0 };
    }
    activityByDate[date].trades++;
  });
  
  // Process burns
  burns.forEach(burn => {
    const date = new Date(burn.timestamp).toISOString().split('T')[0];
    if (!activityByDate[date]) {
      activityByDate[date] = { trades: 0, burns: 0, crafts: 0 };
    }
    activityByDate[date].burns++;
  });
  
  // Process crafts
  crafts.forEach(craft => {
    const date = new Date(craft.timestamp).toISOString().split('T')[0];
    if (!activityByDate[date]) {
      activityByDate[date] = { trades: 0, burns: 0, crafts: 0 };
    }
    activityByDate[date].crafts++;
  });
  
  // Sort dates and format for chart
  const sortedDates = Object.keys(activityByDate).sort();
  
  return {
    timeline: {
      dates: sortedDates,
      trades: sortedDates.map(date => activityByDate[date].trades),
      burns: sortedDates.map(date => activityByDate[date].burns),
      crafts: sortedDates.map(date => activityByDate[date].crafts)
    },
    summary: {
      totalDates: sortedDates.length,
      totalTrades: trades.length,
      totalBurns: burns.length,
      totalCrafts: crafts.length
    }
  };
}

// Get all trades data
router.get('/trades', asyncHandler(async (req, res) => {
  const period = getPeriodParam(req);
  const forceRefresh = req.query.refresh === 'true';
  
  const trades = await blockchainService.getTrades(period, forceRefresh);
  
  res.json({
    success: true,
    period,
    ...trades,
    timestamp: new Date().toISOString()
  });
}));

// Get card burns data
router.get('/burns', asyncHandler(async (req, res) => {
  const period = getPeriodParam(req);
  const forceRefresh = req.query.refresh === 'true';
  
  const burns = await blockchainService.getCardBurns(period, forceRefresh);
  
  res.json({
    success: true,
    period,
    ...burns,
    timestamp: new Date().toISOString()
  });
}));

// Get craftings data
router.get('/crafts', asyncHandler(async (req, res) => {
  const period = getPeriodParam(req);
  const forceRefresh = req.query.refresh === 'true';
  
  const crafts = await blockchainService.getCraftings(period, forceRefresh);
  
  res.json({
    success: true,
    period,
    ...crafts,
    timestamp: new Date().toISOString()
  });
}));

// Get morphings data
router.get('/morphs', asyncHandler(async (req, res) => {
  const period = getPeriodParam(req);
  const forceRefresh = req.query.refresh === 'true';
  
  const morphs = await blockchainService.getMorphings(period, forceRefresh);
  
  res.json({
    success: true,
    period,
    ...morphs,
    timestamp: new Date().toISOString()
  });
}));

// Get GIFTZ sales data
router.get('/giftz', asyncHandler(async (req, res) => {
  const period = getPeriodParam(req);
  const forceRefresh = req.query.refresh === 'true';
  
  const giftz = await blockchainService.getGiftzSales(period, forceRefresh);
  
  res.json({
    success: true,
    period,
    ...giftz,
    timestamp: new Date().toISOString()
  });
}));

// Get users activity data
router.get('/users', asyncHandler(async (req, res) => {
  const period = getPeriodParam(req);
  const forceRefresh = req.query.refresh === 'true';
  
  const users = await blockchainService.getActiveUsers(period, forceRefresh);
  
  res.json({
    success: true,
    period,
    ...users,
    timestamp: new Date().toISOString()
  });
}));

// Get all tracked assets
router.get('/tracked-assets', asyncHandler(async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  
  const assets = await blockchainService.getTrackedAssets(forceRefresh);
  
  res.json({
    success: true,
    ...assets,
    timestamp: new Date().toISOString()
  });
}));

// Get all data at once
router.get('/all', asyncHandler(async (req, res) => {
  const period = getPeriodParam(req);
  const forceRefresh = req.query.refresh === 'true';
  
  const allData = await blockchainService.getAllData(period, forceRefresh);
  
  res.json({
    success: true,
    period,
    ...allData,
    timestamp: new Date().toISOString()
  });
}));

// Cache status endpoint
router.get('/cache/status', (req, res) => {
  const cacheFiles = [
    'combined_trades',
    'combined_users',
    'combined_tracked_assets',
    'ardor_card_burns',
    'ardor_craftings',
    'ardor_morphings',
    'ardor_trades',
    'all_blockchain_data'
  ];
  
  const cacheStatus = cacheFiles.map(filename => {
    const data = readJSON(filename);
    return {
      file: filename,
      exists: !!data,
      timestamp: data?.timestamp || null,
      size: data ? JSON.stringify(data).length : 0
    };
  });
  
  res.json({
    success: true,
    files: cacheStatus,
    timestamp: new Date().toISOString()
  });
});

// Cache refresh endpoint
router.post('/cache/refresh/:type', asyncHandler(async (req, res) => {
  const type = req.params.type;
  const period = getPeriodParam(req);
  
  let result;
  
  switch (type) {
    case 'trades':
      result = await blockchainService.getTrades(period, true);
      break;
    case 'burns':
      result = await blockchainService.getCardBurns(period, true);
      break;
    case 'crafts':
      result = await blockchainService.getCraftings(period, true);
      break;
    case 'morphs':
      result = await blockchainService.getMorphings(period, true);
      break;
    case 'users':
      result = await blockchainService.getActiveUsers(period, true);
      break;
    case 'assets':
      result = await blockchainService.getTrackedAssets(true);
      break;
    case 'all':
      result = await blockchainService.getAllData(period, true);
      break;
    default:
      return res.status(400).json({
        success: false,
        error: `Unknown cache type: ${type}`,
        timestamp: new Date().toISOString()
      });
  }
  
  res.json({
    success: true,
    message: `Cache refreshed for: ${type}`,
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;