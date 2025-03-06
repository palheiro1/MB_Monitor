/**
 * Ardor API Routes
 * Provides RESTful endpoints for Ardor blockchain data
 */
const express = require('express');
const router = express.Router();
const ardorService = require('../services/ardorService');
const cache = require('../cache');

// Get all data (aggregated endpoint)
router.get('/data', async (req, res) => {
  try {
    const data = await ardorService.getAllData();
    res.json(data);
  } catch (error) {
    console.error('Error in Ardor data endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get trades
router.get('/trades', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'ardor_trades';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // If not in cache, fetch fresh data
    const trades = await ardorService.getTrades();
    
    // Cache the result
    cache.set(cacheKey, trades, 300); // Cache for 5 minutes
    
    res.json(trades);
  } catch (error) {
    console.error('Error in Ardor trades endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get tracked assets (regular cards, special cards, and specific tokens)
router.get('/tracked-assets', async (req, res) => {
  try {
    const assets = await ardorService.getTrackedAssets();
    res.json(assets);
  } catch (error) {
    console.error('Error in Ardor tracked assets endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get primary sales
router.get('/primary-sales', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'ardor_primary_sales';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // If not in cache, fetch fresh data
    const sales = await ardorService.getPrimarySales();
    
    // Cache the result
    cache.set(cacheKey, sales, 300);
    
    res.json(sales);
  } catch (error) {
    console.error('Error in Ardor primary sales endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get craftings
router.get('/craftings', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'ardor_craftings';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // If not in cache, fetch fresh data
    const craftings = await ardorService.getCraftings();
    
    // Cache the result
    cache.set(cacheKey, craftings, 300);
    
    res.json(craftings);
  } catch (error) {
    console.error('Error in Ardor craftings endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get morphings
router.get('/morphings', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'ardor_morphings';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // If not in cache, fetch fresh data
    const morphings = await ardorService.getMorphings();
    
    // Cache the result
    cache.set(cacheKey, morphings, 300);
    
    res.json(morphings);
  } catch (error) {
    console.error('Error in Ardor morphings endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get card burns
router.get('/card-burns', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'ardor_card_burns';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // If not in cache, fetch fresh data
    const burns = await ardorService.getCardBurns();
    
    // Cache the result
    cache.set(cacheKey, burns, 300);
    
    res.json(burns);
  } catch (error) {
    console.error('Error in Ardor card burns endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active users
router.get('/active-users', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'ardor_active_users';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // If not in cache, fetch fresh data
    const users = await ardorService.getActiveUsers();
    
    // Cache the result
    cache.set(cacheKey, users, 300);
    
    res.json(users);
  } catch (error) {
    console.error('Error in Ardor active users endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
