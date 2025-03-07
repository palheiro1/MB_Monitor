const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const { initStorage } = require('./utils/jsonStorage');

// Import routes
const ardorRoutes = require('./routes/api/ardor');
const cacheRoutes = require('./routes/api/cache');

// Create Express app
const app = express();

// Initialize storage
initStorage();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Logging

// Routes
app.use('/api/ardor', (req, res, next) => {
  console.log(`API request: ${req.method} ${req.originalUrl}`);
  next();
}, ardorRoutes);
app.use('/api/cache', cacheRoutes);

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Generic data endpoint for debugging
app.get('/api/data', (req, res) => {
  res.json({ message: 'API is working properly!' });
});

// Catch-all route to serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
