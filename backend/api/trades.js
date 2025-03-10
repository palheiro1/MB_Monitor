/**
 * Trades API Routes
 * Provides endpoints related to card trading operations
 */
const express = require('express');
const router = express.Router();
const { getTrades } = require('../services/ardor/trades');
const { filterByPeriod } = require('../utils/filters');

/**
 * @route GET /api/trades
 * @description Get trading operations with optional period filtering
 * @param {string} period - Optional time period filter (24h, 7d, 30d, all)
 */
router.get('/', async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    console.log(`Processing trades request with period=${period}`);
    
    // Get all trading operations
    const tradesData = await getTrades(period, false); // Don't force refresh by default
    
    if (!tradesData || !tradesData.ardor_trades) {
      return res.status(404).json({ error: 'No trades data available' });
    }
    
    return res.json({
      ardor_trades: tradesData.ardor_trades,
      count: tradesData.count || tradesData.ardor_trades.length,
      timestamp: tradesData.timestamp,
      period
    });
  } catch (error) {
    console.error('Error fetching trades data:', error);
    return res.status(500).json({ error: 'Failed to fetch trades data' });
  }
});

module.exports = router;
