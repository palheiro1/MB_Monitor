/**
 * Assets Component
 * 
 * Renders asset cards and handles asset-related functionality.
 */

import { formatAmount } from '../../utils/formatters.js';
import { formatAddress } from '../../utils/formatters.js';

/**
 * Asset card template generator
 * @param {Object} asset - Asset data object
 * @param {string} blockchain - Blockchain type (ardor, polygon)
 * @returns {string} HTML for asset card
 */
export const assetCardTemplate = (asset, blockchain) => {
  // Extract asset data with defaults
  const name = asset.name || 'Unknown Asset';
  const id = asset.id || asset.assetId || asset.asset || 'Unknown';
  const issuer = asset.issuer || asset.accountRS || 'Unknown';
  const description = asset.description || '';
  const quantity = asset.quantity || asset.quantityQNT || '0';
  const decimals = asset.decimals || 0;
  const isArdor = blockchain === 'ardor';
  
  // Limit description length
  const shortDescription = description.length > 100 ? `${description.substring(0, 97)}...` : description;
  
  // Determine card class based on blockchain
  const blockchainClass = isArdor ? 'ardor-card' : 'polygon-card';
  
  // Format issuer for display
  const shortenAddress = formatAddress;
  
  return `
    <div class="card asset-card ${blockchainClass}">
      <div class="card-header">
        <h3 class="card-title">${name}</h3>
        <span class="blockchain-badge ${blockchain}">${blockchain.toUpperCase()}</span>
      </div>
      <div class="card-body">
        <p><strong>ID:</strong> ${id}</p>
        <p><strong>Issuer:</strong> ${shortenAddress(issuer)}</p>
        <p><strong>Quantity:</strong> ${formatAmount(quantity, decimals)}</p>
        <p><strong>Description:</strong> ${shortDescription}</p>
      </div>
      <div class="card-footer">
        <a href="#" class="btn btn-sm btn-primary view-details" data-id="${id}" data-blockchain="${blockchain}">View Details</a>
      </div>
    </div>
  `;
};

/**
 * Initialize assets component with event handlers
 */
export function initAssetsComponent() {
  // Add event listeners for asset detail buttons
  document.addEventListener('click', function(event) {
    const button = event.target.closest('.view-details');
    if (button) {
      event.preventDefault();
      const assetId = button.dataset.id;
      const blockchain = button.dataset.blockchain;
      console.log(`View details clicked for ${blockchain} asset: ${assetId}`);
      // Here you would show asset details in a modal or redirect to details page
    }
  });
  
  console.log('Assets component initialized');
  return true;
}

/**
 * Render a list of assets into a container
 * @param {HTMLElement} container - Container element
 * @param {Array} assets - Array of assets to render
 * @param {string} blockchain - Blockchain type (ardor, polygon)
 */
export function renderAssets(container, assets, blockchain = 'ardor') {
  if (!container || !Array.isArray(assets)) {
    console.error('Invalid container or assets', { container, assets });
    return;
  }
  
  console.log(`Rendering ${assets.length} ${blockchain} assets`);
  
  // Clear container
  container.innerHTML = '';
  
  // Render each asset
  assets.forEach(asset => {
    try {
      const assetHtml = assetCardTemplate(asset, blockchain);
      container.insertAdjacentHTML('beforeend', assetHtml);
    } catch (error) {
      console.error('Error rendering asset card:', error, asset);
    }
  });
}