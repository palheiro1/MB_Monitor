/**
 * Polygon API Routes
 * Provides RESTful endpoints for Polygon blockchain data
 */
const express = require('express');
const router = express.Router();
const polygonService = require('../services/polygonService');
const cache = require('../cache');

// Get all data (aggregated endpoint)
router.get('/data', async (req, res) => {
  try {
    const data = await polygonService.getAllData();
    res.json(data);
  } catch (error) {
    console.error('Error in Polygon data endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get trades
router.get('/trades', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'polygon_trades';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // If not in cache, fetch fresh data
    const trades = await polygonService.getTrades();
    
    // Cache the result
    cache.set(cacheKey, trades, 300); // Cache for 5 minutes
    
    res.json(trades);
  } catch (error) {
    console.error('Error in Polygon trades endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get tracked tokens from ERC1155 contract
router.get('/tracked-tokens', async (req, res) => {
  try {
    const tokens = await polygonService.getTrackedTokens();
    res.json(tokens);
  } catch (error) {
    console.error('Error in Polygon tracked tokens endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active users
router.get('/active-users', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'polygon_active_users';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // If not in cache, fetch fresh data
    const users = await polygonService.getActiveUsers();
    
    // Cache the result
    cache.set(cacheKey, users, 300);
    
    res.json(users);
  } catch (error) {
    console.error('Error in Polygon active users endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
