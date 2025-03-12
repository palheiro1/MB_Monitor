// ...existing code...

/**
 * Update the morphs statistics display
 */
function updateMorphsDisplay(data) {
    if (!data || !data.morphs) return;
    
    // IMPORTANT: Use the server-provided totalQuantity which should be filtered correctly
    const totalQuantity = data.totalQuantity || data.morphs.reduce((sum, morph) => sum + (parseInt(morph.quantity, 10) || 1), 0);
    
    // Get previous count for animation
    const prevCount = getStoredStat('morphsCount') || 0;
    
    // Update the stats display - CRITICAL FIX: use correct ID "card-morphs" instead of "morphs-count"
    document.getElementById('card-morphs').textContent = formatNumber(totalQuantity);
    document.getElementById('morphs-operations').textContent = formatNumber(data.morphs.length);
    
    // Update the stored stat
    setStoredStat('morphsCount', totalQuantity);
    
    // Log the update
    console.log(`Updated morphs display: ${prevCount} → ${totalQuantity} cards morphed [${currentPeriod}]`);
}

/**
 * Update the crafts statistics display
 */
function updateCraftsDisplay(data) {
    if (!data || !data.crafts) return;
    
    // IMPORTANT: Use the server-provided totalQuantity which should be filtered correctly
    const totalQuantity = data.totalQuantity || data.crafts.reduce((sum, craft) => sum + (parseInt(craft.quantity, 10) || 1), 0);
    
    // Update the stats display
    document.getElementById('card-crafts').textContent = formatNumber(totalQuantity);
    document.getElementById('crafts-operations').textContent = formatNumber(data.crafts.length);
}

// ...existing code...
