/**
 * Polygon API Routes
 */
const express = require('express');
const router = express.Router();
const polygonService = require('../services/polygonService');

// Get all data
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
    const trades = await polygonService.getTrades();
    res.json(trades);
  } catch (error) {
    console.error('Error in Polygon trades endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active users
router.get('/active-users', async (req, res) => {
  try {
    const users = await polygonService.getActiveUsers();
    res.json(users);
  } catch (error) {
    console.error('Error in Polygon active users endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
