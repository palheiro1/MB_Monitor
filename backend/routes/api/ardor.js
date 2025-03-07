const express = require('express');
const router = express.Router();
const { readJSON } = require('../../utils/jsonStorage');
const { getCraftings } = require('../../services/ardor/crafting');
const { getBurns } = require('../../services/ardor/burns');
const { getTrades } = require('../../services/ardor/trades');

// Route to get Ardor trades with period filtering
router.get('/trades', async (req, res) => {
  try {
    const period = req.query.period || 'all';
    const forceRefresh = req.query.refresh === 'true';
    
    console.log(`Fetching Ardor trades with period: ${period}, forceRefresh: ${forceRefresh}`);
    
    const tradesData = await getTrades(period, forceRefresh);
    
    res.json(tradesData);
  } catch (error) {
    console.error('Error getting Ardor trades:', error);
    res.status(500).json({ error: 'Failed to get Ardor trades' });
  }
});

// Debug - add logging to see if the craftings endpoint is being called
router.get('/craftings', async (req, res) => {
  console.log("Craftings API endpoint called");
  try {
    const craftingsResponse = await getCraftingsData();
    console.log(`Returning ${craftingsResponse?.ardor_craftings?.length || 0} crafting records`);
    return res.json(craftingsResponse);
  } catch (error) {
    console.error("Error fetching craftings data:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Add other Ardor-related routes here

module.exports = router;
