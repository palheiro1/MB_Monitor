const express = require('express');
const router = express.Router();

// ...existing code...

// Fix route - add /morphs endpoint that matches frontend expectation
router.get('/morphs', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const forceRefresh = req.query.refresh === 'true';
    
    console.log(`Processing morphs request with period=${period}, forceRefresh=${forceRefresh}`);
    
    // Use the correct service import
    const { getMorphings } = require('../services/ardor/morphing');
    const morphingData = await getMorphings(forceRefresh, period);
    
    // Ensure data structure matches what frontend expects
    const response = {
      morphs: morphingData.morphs || [],
      count: morphingData.count || 0,
      timestamp: morphingData.timestamp || new Date().toISOString(),
      period: period
    };
    
    console.log(`Returning ${response.morphs.length} morphs`);
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

// ...existing code...

module.exports = router;