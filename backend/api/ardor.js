/**
 * Ardor API Routes
 */
const express = require('express');
const router = express.Router();
const ardorService = require('../services/ardorService');

// Get all data
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
    const trades = await ardorService.getTrades();
    res.json(trades);
  } catch (error) {
    console.error('Error in Ardor trades endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get primary sales
router.get('/primary-sales', async (req, res) => {
  try {
    const sales = await ardorService.getPrimarySales();
    res.json(sales);
  } catch (error) {
    console.error('Error in Ardor primary sales endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get craftings
router.get('/craftings', async (req, res) => {
  try {
    const craftings = await ardorService.getCraftings();
    res.json(craftings);
  } catch (error) {
    console.error('Error in Ardor craftings endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get morphings
router.get('/morphings', async (req, res) => {
  try {
    const morphings = await ardorService.getMorphings();
    res.json(morphings);
  } catch (error) {
    console.error('Error in Ardor morphings endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get card burns
router.get('/card-burns', async (req, res) => {
  try {
    const burns = await ardorService.getCardBurns();
    res.json(burns);
  } catch (error) {
    console.error('Error in Ardor card burns endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active users
router.get('/active-users', async (req, res) => {
  try {
    const users = await ardorService.getActiveUsers();
    res.json(users);
  } catch (error) {
    console.error('Error in Ardor active users endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
