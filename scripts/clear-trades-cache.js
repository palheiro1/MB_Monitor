const fs = require('fs');
const path = require('path');

// Trade cache files - just the master files, no period-specific files
const tradeFiles = [
  'ardor_trades.json',
  'polygon_trades.json'
];

// Also look for any legacy period-specific files to clean up
const legacyPeriodFiles = [
  'ardor_trades_24h.json',
  'ardor_trades_7d.json',
  'ardor_trades_30d.json',
  'ardor_trades_all.json'
];

// Storage directory
const STORAGE_DIR = path.join(__dirname, '../backend/storage');

console.log('Trade Cache Cleaner');
console.log('------------------');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  console.log('Storage directory does not exist:', STORAGE_DIR);
  process.exit(1);
}

// Delete each trade cache file
let deletedCount = 0;
tradeFiles.forEach(filename => {
  const filePath = path.join(STORAGE_DIR, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Successfully deleted ${filename}`);
      deletedCount++;
    } catch (error) {
      console.error(`❌ Error deleting ${filename}: ${error.message}`);
    }
  } else {
    console.log(`ℹ️ File does not exist: ${filename}`);
  }
});

// Also clean up any legacy period-specific files that might exist
console.log("\nLooking for legacy period-specific trade cache files...");
legacyPeriodFiles.forEach(filename => {
  const filePath = path.join(STORAGE_DIR, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Successfully deleted legacy file ${filename}`);
      deletedCount++;
    } catch (error) {
      console.error(`❌ Error deleting ${filename}: ${error.message}`);
    }
  }
});

// Also delete all data cache that might contain old trade counts
const allDataPath = path.join(STORAGE_DIR, 'unified_all_data.json');
if (fs.existsSync(allDataPath)) {
  try {
    fs.unlinkSync(allDataPath);
    console.log('✅ Successfully deleted all data cache');
    deletedCount++;
  } catch (error) {
    console.error(`❌ Error deleting all data cache: ${error.message}`);
  }
}

if (deletedCount > 0) {
  console.log('\n🔄 Trade caches cleared! Restart the server to fetch fresh trade data.');
} else {
  console.log('\nℹ️ No trade cache files found to delete.');
}

// Instructions for manually triggering trade refresh
console.log('\nTo force refresh trades via API after server restart:');
console.log('  curl -X GET "http://localhost:3000/api/ardor/trades?refresh=true&period=all"');
