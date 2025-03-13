/**
 * Transaction Renderer
 * Unified rendering logic for all transaction types
 */

import { formatters } from '../utils/formatters.js';

export class TransactionRenderer {
  constructor() {
    // Common CSS classes
    this.cssClasses = {
      card: 'transaction-card',
      container: 'transactions-container',
      header: 'transaction-header',
      body: 'transaction-body',
      footer: 'transaction-footer',
      rarity: {
        common: 'rarity-common',
        rare: 'rarity-rare',
        'very rare': 'rarity-very-rare',
        legendary: 'rarity-legendary',
        mythical: 'rarity-mythical'
      },
      type: {
        Terrestrial: 'type-terrestrial',
        Aerial: 'type-aerial',
        Aquatic: 'type-aquatic'
      }
    };
  }

  /**
   * Render burns
   */
  renderBurns(burns, containerSelector) {
    // ...existing code...
  }

  /**
   * Render crafts
   */
  renderCrafts(craftings, containerSelector) {
    // ...existing code...
  }

  /**
   * Render trades
   */
  renderTrades(trades, containerSelector) {
    // ...existing code...
  }

  /**
   * Render morphs
   */
  renderMorphs(morphs, containerSelector) {
    // ...existing code...
  }

  /**
   * Create a transaction card element
   */
  createTransactionCard(transaction, options) {
    const { title, subtitle, details, footer } = options;
    
    const card = document.createElement('div');
    card.className = this.cssClasses.card;
    card.dataset.id = transaction.id || '';
    
    // Create card header
    const header = document.createElement('div');
    header.className = this.cssClasses.header;
    
    const titleEl = document.createElement('h4');
    titleEl.textContent = title;
    header.appendChild(titleEl);
    
    const subtitleEl = document.createElement('p');
    subtitleEl.textContent = subtitle;
    header.appendChild(subtitleEl);
    
    card.appendChild(header);
    
    // Create card body with details
    const body = document.createElement('div');
    body.className = this.cssClasses.body;
    
    const detailsList = document.createElement('dl');
    details.forEach(detail => {
      const dt = document.createElement('dt');
      dt.textContent = detail.label;
      
      const dd = document.createElement('dd');
      dd.textContent = detail.value;
      
      detailsList.appendChild(dt);
      detailsList.appendChild(dd);
    });
    
    body.appendChild(detailsList);
    card.appendChild(body);
    
    // Create card footer
    if (footer) {
      const footerEl = document.createElement('div');
      footerEl.className = this.cssClasses.footer;
      footerEl.textContent = footer;
      card.appendChild(footerEl);
    }
    
    return card;
  }

  /**
   * Add card-specific CSS classes based on card properties
   */
  addCardClasses(cardElement, cardData) {
    // Add rarity-based class
    const rarityClass = this.cssClasses.rarity[cardData.cardRarity?.toLowerCase()];
    if (rarityClass) {
      cardElement.classList.add(rarityClass);
    }
    
    // Add type-based class
    const typeClass = this.cssClasses.type[cardData.cardType];
    if (typeClass) {
      cardElement.classList.add(typeClass);
    }
    
    return cardElement;
  }
}