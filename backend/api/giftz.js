/**
 * Giftz API Routes
 * Provides endpoints related to Giftz token sales
 */
const express = require('express');
const router = express.Router();
const ardorService = require('../services/ardorService');

/**
 * @route GET /api/giftz
 * @description Get Giftz sales with period filtering
 * @param {string} period - Optional time period filter (24h, 7d, 30d, all)
 * @param {boolean} refresh - Whether to force cache refresh
 */
// Get Giftz sales with optional refresh
router.get('/', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const forceRefresh = req.query.refresh === 'true';
    
    console.log(`Processing Giftz sales request with period=${period}, forceRefresh=${forceRefresh}`);
    
    // Pass both forceRefresh and period parameters
    const giftzData = await ardorService.getGiftzSales(forceRefresh, period);
    
    // Always recalculate totalQuantity based on the filtered data
    let totalQuantity = 0;
    
    if (giftzData.sales && Array.isArray(giftzData.sales)) {
      for (const sale of giftzData.sales) {
        totalQuantity += Number(sale.quantity || 1);
      }
    }
    
    console.log(`Returning Giftz sales data with ${giftzData.sales?.length || 0} items for period ${period}. Total quantity: ${totalQuantity}`);
    
    res.json({
      ...giftzData,
      totalQuantity
    });
  } catch (error) {
    console.error('Error fetching Giftz sales data:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
