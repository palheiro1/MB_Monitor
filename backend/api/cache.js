const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Get the directory for JSON storage
const storageDir = path.join(__dirname, '../storage');

// Get cache file list
router.get('/status', (req, res) => {
  try {
    const files = fs.readdirSync(storageDir)
      .filter(filename => filename.endsWith('.json'))
      .map(filename => {
        const filePath = path.join(storageDir, filename);
        const stats = fs.statSync(filePath);
        let data = null;
        
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          data = JSON.parse(fileContent);
        } catch (parseError) {
          console.error(`Error parsing ${filename}:`, parseError);
        }
        
        return {
          filename,
          size: stats.size,
          lastModified: stats.mtime,
          data
        };
      });
    
    res.json({
      status: 'success',
      files
    });
  } catch (error) {
    console.error('Error getting cache status:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get specific cache file
router.get('/file/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(storageDir, `${filename}.json`);
  
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    res.json({
      status: 'success',
      data
    });
  } catch (error) {
    console.error(`Error reading cache file ${filename}:`, error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Debug endpoint to test API response format
router.get('/debug', (req, res) => {
  try {
    // Send a simple JSON response
    res.json({
      status: 'success',
      message: 'API is working correctly',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get cache file contents in raw format for debugging
router.get('/raw/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(storageDir, `${filename}.json`);
  
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/plain');
    res.send(fileContent);
  } catch (error) {
    console.error(`Error reading cache file ${filename}:`, error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

module.exports = router;
