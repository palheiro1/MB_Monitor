const fs = require('fs');
const path = require('path');

// Path to the GEM burns cache file
const gemBurnsCachePath = path.join(__dirname, '../backend/storage/ardor_gem_burns.json');
const allDataCachePath = path.join(__dirname, '../backend/storage/unified_all_data.json');

console.log('GEM Burns Cache Cleaner');
console.log('---------------------');

// Delete the GEM burns cache file if it exists
if (fs.existsSync(gemBurnsCachePath)) {
  fs.unlinkSync(gemBurnsCachePath);
  console.log('✅ Successfully deleted GEM burns cache file');
} else {
  console.log('ℹ️ GEM burns cache file does not exist');
}

// Delete the all data cache file if it exists
if (fs.existsSync(allDataCachePath)) {
  fs.unlinkSync(allDataCachePath);
  console.log('✅ Successfully deleted all data cache file');
} else {
  console.log('ℹ️ All data cache file does not exist');
}

console.log('\nCache cleared! Restart the server to fetch fresh GEM burns data.');
