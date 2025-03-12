/**
 * Trades API Routes
 * Provides endpoints related to asset trading
 */
const express = require('express');
const router = express.Router();
const ardorService = require('../services/ardorService');

router.get('/', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const forceRefresh = req.query.refresh === 'true';
    
    console.log(`Processing trades request with period=${period}`);
    
    // Get trades data
    const tradesData = await ardorService.getTrades(period, forceRefresh);
    
    // Always recalculate totalQuantity based on the filtered data
    let totalQuantity = 0;
    
    if (tradesData.ardor_trades && Array.isArray(tradesData.ardor_trades)) {
      for (const trade of tradesData.ardor_trades) {
        totalQuantity += Number(trade.quantity || 1);
      }
    }
    
    console.log(`Trades response: ${tradesData.ardor_trades?.length || 0} trades with ${totalQuantity} total quantity for period ${period}`);
    
    res.json({
      ...tradesData,
      totalQuantity
    });
  } catch (error) {
    console.error('Error fetching trades data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
