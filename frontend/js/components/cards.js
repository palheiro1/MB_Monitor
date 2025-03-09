/**
 * Cards Module
 * 
 * Re-exports card rendering functionality from transaction components
 * for easier imports throughout the application.
 */

import { renderAllCards, renderAllCardsWithAnimation } from './transactions/index.js';
import { renderCraftCards } from './transactions/crafts.js';
import { renderBurnCards } from './transactions/burns.js';
import { renderTradeCards } from './transactions/trades.js';

// Re-export the rendering functions
export {
  renderAllCards,
  renderAllCardsWithAnimation,
  renderCraftCards,
  renderBurnCards,
  renderTradeCards
};

/**
 * Render all cards with a particular highlight
 * @param {string} highlightType - Type of card to highlight
 */
export function renderCardsWithHighlight(highlightType) {
  const allCards = document.querySelectorAll('.transaction-card');
  
  // Remove any existing highlights
  allCards.forEach(card => card.classList.remove('highlighted'));
  
  // Add highlight to selected card type
  const cardsToHighlight = document.querySelectorAll(`.${highlightType}-card`);
  cardsToHighlight.forEach(card => card.classList.add('highlighted'));
}
