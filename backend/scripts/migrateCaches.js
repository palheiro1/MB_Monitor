/**
 * Cache Migration Script
 * Run this script once to migrate from period-specific to unified cache system
 */
const { migrateAllCaches } = require('../utils/cacheMigration');

// Self-executing async function
(async () => {
  console.log('Starting cache migration...');
  
  try {
    const result = await migrateAllCaches();
    
    console.log('Migration completed:');
    console.log(`- Successfully migrated: ${result.migrated} data types`);
    console.log(`- Failed migrations: ${result.failed} data types`);
    
    // Print detailed results
    result.results.forEach(res => {
      if (res.success) {
        console.log(`✅ ${res.dataType}: Migrated ${res.records} records from ${res.source} to ${res.destination}`);
      } else {
        console.log(`❌ ${res.dataType}: Failed - ${res.message}`);
      }
    });
    
    console.log('\nMigration complete! You can now use the unified cache system.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
})();
