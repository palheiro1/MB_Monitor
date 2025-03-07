const express = require('express');
const path = require('path');
const cors = require('cors');
const api = require('./api');
const ardorService = require('./services/ardorService');
const polygonService = require('./services/polygonService');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api', api);

// Initialize services
console.log('Initializing blockchain services...');
ardorService.init();
polygonService.init();

// Temporary: Force execution of burn detection on startup
// This ensures the cache is populated immediately instead of waiting for the service cycle
console.log('Running initial burn detection...');
ardorService.getCardBurns().catch(err => console.error('Initial burn detection failed:', err));
ardorService.getGEMBurns().catch(err => console.error('Initial GEM burn detection failed:', err));

// Also fetch trade data on startup - fetch all trades, not just 30d
console.log('Running initial trade detection...');
ardorService.getTrades('all', true).catch(err => console.error('Initial trade detection failed:', err));

// Frontend route - serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});
