/**
 * Script to run only the getCraftings function
 * 
 * Usage:
 * node scripts/run-craftings.js [--force] [--save-only]
 * 
 * Options:
 *   --force      Force refresh the cache
 *   --save-only  Only save to cache without output
 */

const { getCraftings } = require('../services/ardor/crafting');

async function main() {
  console.log('Starting crafting data collection...');
  
  // Check if force refresh is requested via command line args
  const forceRefresh = process.argv.includes('--force');
  const saveOnly = process.argv.includes('--save-only');
  
  try {
    console.log(`Running getCraftings(forceRefresh=${forceRefresh})...`);
    const startTime = Date.now();
    const result = await getCraftings(forceRefresh);
    const endTime = Date.now();
    
    console.log(`\nOperation completed in ${(endTime - startTime) / 1000} seconds`);
    console.log(`Found ${result.count} craft operations`);
    
    if (!saveOnly && result.craftings && result.craftings.length > 0) {
      console.log('\nSample of craft operations:');
      // Show first 5 operations as sample
      result.craftings.slice(0, 5).forEach((craft, index) => {
        console.log(`\n[${index + 1}] ${craft.cardName} (${craft.cardRarity})`);
        console.log(`  - Date: ${craft.date}`);
        console.log(`  - Recipient: ${craft.recipient}`);
        console.log(`  - Cards used: ${craft.cardsUsed}`);
        console.log(`  - Asset ID: ${craft.assetId}`);
      });
      
      // Show distribution summary
      console.log('\nCraft Distribution by Rarity:');
      const rarityCount = {};
      result.craftings.forEach(craft => {
        rarityCount[craft.cardRarity] = (rarityCount[craft.cardRarity] || 0) + 1;
      });
      
      Object.entries(rarityCount).forEach(([rarity, count]) => {
        console.log(`  - ${rarity}: ${count} (${(count / result.count * 100).toFixed(1)}%)`);
      });
    }
  } catch (error) {
    console.error('Error running crafting collection:', error);
  }
}

main()
  .then(() => console.log('\nDone!'))
  .catch(error => console.error(error))
  .finally(() => process.exit(0));
