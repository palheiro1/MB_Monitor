/**
 * Stats Component
 * 
 * Handles rendering and updating of the statistics summary at the top of the dashboard.
 */

import { getState } from '../state/index.js';
import { formatNumber } from '../utils/formatters.js';
import { getElement } from './ui-manager.js';

/**
 * Update statistics with animations for changed values
 * Compares previous and current statistics to animate changes
 */
export function updateStatsWithAnimation() {
  const stats = getState('currentData.statsData') || {};
  const prevStats = getState('previousData.statsData') || {};
  
  // Get DOM elements for stats
  const elements = {
    totalTrades: getElement('totalTrades'),
    activeUsers: getElement('activeUsers'),
    cardCrafts: getElement('cardCrafts'),
    cardBurns: getElement('cardBurns'),
    giftzSales: getElement('giftzSales'),
    cardMorphs: getElement('cardMorphs')
  };
  
  // Update each stat with animation if value changed
  animateCounterIfChanged(elements.totalTrades, prevStats.total_trades, stats.total_trades || 0);
  animateCounterIfChanged(elements.activeUsers, prevStats.active_users, stats.active_users || 0);
  animateCounterIfChanged(elements.cardCrafts, prevStats.card_crafts, stats.card_crafts || 0);
  animateCounterIfChanged(elements.cardBurns, prevStats.card_burns, stats.card_burns || 0);
  animateCounterIfChanged(elements.giftzSales, prevStats.giftz_sales, stats.giftz_sales || 0);
  animateCounterIfChanged(elements.cardMorphs, prevStats.card_morphs, stats.card_morphs || 0);
}

/**
 * Animate a counter when its value changes
 * This provides a smooth transition between old and new values
 * 
 * @param {HTMLElement} element - DOM element to update
 * @param {number} oldValue - Previous value
 * @param {number} newValue - New value to animate to
 */
function animateCounterIfChanged(element, oldValue, newValue) {
  if (!element) return;
  
  // Just update directly if animations disabled or no change
  const animationsEnabled = getState('animationsEnabled');
  if (!animationsEnabled || oldValue === newValue) {
    element.textContent = formatNumber(newValue);
    return;
  }
  
  // Parse values to ensure they're numbers
  oldValue = parseInt(oldValue) || 0;
  newValue = parseInt(newValue) || 0;
  
  // Highlight element to show change
  const highlightClass = newValue > oldValue ? 'highlight-increase' : 'highlight-decrease';
  element.classList.add(highlightClass);
  
  // Get animation duration from config
  const duration = getState('config.COUNTER_ANIMATION_DURATION') || 1000;
  
  // Animate the counter
  const startTime = performance.now();
  const updateCounter = (currentTime) => {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    
    // Easing function for smoother animation
    const easeOutQuad = t => t * (2 - t);
    const easedProgress = easeOutQuad(progress);
    
    const currentValue = Math.round(oldValue + (newValue - oldValue) * easedProgress);
    element.textContent = formatNumber(currentValue);
    
    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    } else {
      // Animation complete, remove highlight after a delay
      setTimeout(() => {
        element.classList.remove(highlightClass);
      }, 500);
    }
  };
  
  requestAnimationFrame(updateCounter);
}
