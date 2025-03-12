const express = require('express');
const router = express.Router();

// ...existing code...

// Fix route - add /morphs endpoint that matches frontend expectation
router.get('/morphs', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const forceRefresh = req.query.refresh === 'true';
    
    console.log(`Processing morphs request with period=${period}, forceRefresh=${forceRefresh}`);
    
    // Get morphings data with proper service call
    const ardorService = require('../services/ardorService');
    const morphingData = await ardorService.getMorphings(forceRefresh, period);
    
    // Debug the data to verify totalQuantity is present
    console.log(`API response ready - period: ${period}, count: ${morphingData.count}, totalQuantity: ${morphingData.totalQuantity}`);
    
    // FIXED: Properly create the response object using morphingData
    const response = {
      morphs: morphingData.morphs || [],
      count: morphingData.count || 0,
      totalQuantity: morphingData.totalQuantity || 0,
      timestamp: morphingData.timestamp || new Date().toISOString(),
      period: period
    };
    
    // Ensure totalQuantity is calculated and included based on FILTERED morphs
    if (!response.totalQuantity && response.morphs) {
      response.totalQuantity = response.morphs.reduce((sum, morph) => 
        sum + (parseInt(morph.quantity, 10) || 1), 0);
      console.log(`Recalculated totalQuantity for ${period}: ${response.totalQuantity} from ${response.morphs.length} operations`);
    }
    
    console.log(`Returning ${response.morphs.length} morphs with total quantity ${response.totalQuantity}`);
    res.json(response);
  } catch (error) {
    console.error('Error processing morphs request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Keep the /morphings endpoint for backward compatibility if needed
router.get('/morphings', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    console.log(`Processing morphings request with period=${period}`);
    
    const { getMorphings } = require('../services/ardor/morphing');
    const morphingData = await getMorphings(false);
    
    res.json(morphingData);
  } catch (error) {
    console.error('Error processing morphings request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Ardor trades
router.get('/trades/ardor', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const forceRefresh = req.query.refresh === 'true';
    
    console.log(`Processing Ardor trades request with period=${period}`);
    
    // Get the trades data
    const { getTrades } = require('../services/ardor/trades');
    const tradesData = await getTrades(forceRefresh, period);
    
    // Debug log to verify data structure
    if (tradesData && tradesData.ardor_trades && tradesData.ardor_trades.length > 0) {
      const firstTrade = tradesData.ardor_trades[0];
      console.log(`First trade sample - has card_name: ${'card_name' in firstTrade}, value: ${firstTrade.card_name || 'undefined'}`);
    }
    
    // Return the data as-is without modifying its structure
    res.json(tradesData);
  } catch (error) {
    console.error('Error fetching Ardor trades:', error);
    res.status(500).json({ error: error.message });
  }
});

// ...existing code...async (req, res) => {
  // ...existing code...
  const response = {
    crafts: craftingData.crafts || [],
    count: craftingData.count || 0,
    totalQuantity: craftingData.totalQuantity || 0,
    timestamp: craftingData.timestamp,
    period: period
  };
  
  res.json(response);
});

// ...existing code...

module.exports = router;