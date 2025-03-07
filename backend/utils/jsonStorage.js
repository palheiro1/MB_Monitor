const fs = require('fs');
const path = require('path');

// Storage directory
const STORAGE_DIR = path.join(__dirname, '../storage');

/**
 * Read JSON data from storage file
 * 
 * @param {string} filename - Name of file without extension
 * @returns {Object|null} - Parsed JSON data or null if file doesn't exist
 */
function readJSON(filename) {
  try {
    const filePath = path.join(STORAGE_DIR, `${filename}.json`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`Cache file not found: ${filePath}`);
      return null;
    }
    
    // Read and parse file
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);
    
    console.log(`Successfully read cache from ${filePath}`);
    return data;
  } catch (error) {
    console.error(`Error reading JSON file ${filename}: ${error.message}`);
    return null;
  }
}

/**
 * Write JSON data to storage file
 * 
 * @param {string} filename - Name of file without extension
 * @param {Object} data - Data to write
 * @returns {boolean} - Success status
 */
function writeJSON(filename, data) {
  try {
    // Ensure storage directory exists
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    
    const filePath = path.join(STORAGE_DIR, `${filename}.json`);
    
    // Write data to file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully wrote cache to ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error writing JSON file ${filename}: ${error.message}`);
    return false;
  }
}

module.exports = {
  readJSON,
  writeJSON
};
