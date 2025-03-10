/**
 * Giftz API Routes
 * Provides endpoints related to Giftz token sales
 */
const express = require('express');
const router = express.Router();
const ardorService = require('../services/ardorService');

// Get Giftz sales with optional refresh
router.get('/', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const forceRefresh = req.query.refresh === 'true';
    
    console.log(`Processing Giftz sales request with period=${period}, forceRefresh=${forceRefresh}`);
    
    // Pass both forceRefresh and period parameters
    const giftzData = await ardorService.getGiftzSales(forceRefresh, period);
    
    // Add debugging logs
    console.log(`Giftz data structure: ${JSON.stringify({
      period: period,
      count: giftzData.count || 0,
      salesCount: (giftzData.sales || []).length,
      totalQuantity: giftzData.totalQuantity || 'not set',
      firstSale: giftzData.sales && giftzData.sales.length > 0 ? {
        quantity: giftzData.sales[0].quantity,
        timestamp: giftzData.sales[0].timestamp
      } : 'no sales'
    })}`);
    
    res.json(giftzData);
  } catch (error) {
    console.error('Error fetching Giftz sales data:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
