/**
 * Assets Component
 * 
 * This component displays tracked assets from both Ardor and Polygon blockchains.
 */
import { formatTimestamp, formatAmount, shortenAddress } from '../../utils/formatters.js';
import { fetchTrackedAssets } from '../../api/endpoints.js';

// Asset card template
const assetCardTemplate = (asset, blockchain) => {
  const isArdor = blockchain === 'ardor';
  
  // Determine asset details based on blockchain
  const name = isArdor ? (asset.name || `Asset #${asset.asset}`) : (asset.metadata?.name || `Token #${asset.id?.tokenId}`);
  const id = isArdor ? asset.asset : asset.id?.tokenId;
  const issuer = isArdor ? (asset.accountRS || 'Unknown') : 'ERC1155 Contract';
  const quantity = isArdor ? asset.quantityQNT : (asset.balance || '1');
  const description = isArdor ? (asset.description || 'No description') : (asset.metadata?.description || 'No description');
  
  // Limit description length
  const shortDescription = description.length > 100 ? `${description.substring(0, 97)}...` : description;
  
  // Determine card class based on blockchain
  const blockchainClass = isArdor ? 'ardor-card' : 'polygon-card';
  
  return `
    <div class="card asset-card ${blockchainClass}">
      <div class="card-header">
        <h3 class="card-title">${name}</h3>
        <span class="blockchain-badge ${blockchain}">${blockchain.toUpperCase()}</span>
      </div>
      <div class="card-body">
        <p><strong>ID:</strong> ${id}</p>
        <p><strong>Issuer:</strong> ${shortenAddress(issuer)}</p>
        <p><strong>Quantity:</strong> ${formatAmount(quantity)}</p>
        <p><strong>Description:</strong> ${shortDescription}</p>
      </div>
      <div class="card-footer">
        <a href="#" class="btn btn-sm btn-primary view-details" data-id="${id}" data-blockchain="${blockchain}">View Details</a>
      </div>
    </div>
  `;
};

/**
 * Initialize the assets component
 */
export function initAssetsComponent() {
  const assetsContainer = document.getElementById('assets-container');
  if (!assetsContainer) return;
  
  // Filter controls
  const blockchainFilter = document.getElementById('blockchain-filter');
  const assetTypeFilter = document.getElementById('asset-type-filter');
  const searchInput = document.getElementById('asset-search');
  
  let trackedAssets = {
    ardor: {
      regularCards: [],
      specialCards: [],
      specificTokens: []
    },
    polygon: {
      tokens: []
    }
  };
  
  /**
   * Render assets based on current filters
   */
  function renderAssets() {
    // Get current filter values
    const blockchainValue = blockchainFilter ? blockchainFilter.value : 'all';
    const assetTypeValue = assetTypeFilter ? assetTypeFilter.value : 'all';
    const searchValue = searchInput ? searchInput.value.toLowerCase() : '';
    
    // Clear the container
    if (assetsContainer) {
      assetsContainer.innerHTML = '<div class="loading">Loading assets...</div>';
    }
    
    // Filter assets based on selected filters
    let filteredAssets = [];
    
    // Filter by blockchain
    if (blockchainValue === 'all' || blockchainValue === 'ardor') {
      // Add Ardor assets
      if (assetTypeValue === 'all' || assetTypeValue === 'regular') {
        filteredAssets = filteredAssets.concat(
          trackedAssets.ardor.regularCards.map(asset => ({ asset, blockchain: 'ardor', type: 'regular' }))
        );
      }
      
      if (assetTypeValue === 'all' || assetTypeValue === 'special') {
        filteredAssets = filteredAssets.concat(
          trackedAssets.ardor.specialCards.map(asset => ({ asset, blockchain: 'ardor', type: 'special' }))
        );
      }
      
      if (assetTypeValue === 'all' || assetTypeValue === 'specific') {
        filteredAssets = filteredAssets.concat(
          trackedAssets.ardor.specificTokens.map(asset => ({ asset, blockchain: 'ardor', type: 'specific' }))
        );
      }
    }
    
    // Add Polygon assets
    if (blockchainValue === 'all' || blockchainValue === 'polygon') {
      filteredAssets = filteredAssets.concat(
        trackedAssets.polygon.tokens.map(asset => ({ asset, blockchain: 'polygon', type: 'token' }))
      );
    }
    
    // Apply search filter if needed
    if (searchValue) {
      filteredAssets = filteredAssets.filter(item => {
        const asset = item.asset;
        const name = item.blockchain === 'ardor' 
          ? (asset.name || '') 
          : (asset.metadata?.name || '');
        const description = item.blockchain === 'ardor'
          ? (asset.description || '')
          : (asset.metadata?.description || '');
        const id = item.blockchain === 'ardor'
          ? asset.asset
          : asset.id?.tokenId;
          
        return (
          name.toLowerCase().includes(searchValue) ||
          description.toLowerCase().includes(searchValue) ||
          id.toString().includes(searchValue)
        );
      });
    }
    
    // Render filtered assets
    if (assetsContainer) {
      if (filteredAssets.length === 0) {
        assetsContainer.innerHTML = '<div class="no-data">No assets found matching the selected filters</div>';
      } else {
        assetsContainer.innerHTML = filteredAssets.map(item => 
          assetCardTemplate(item.asset, item.blockchain)
        ).join('');
      }
    }
    
    // Update asset counts
    updateAssetCounts();
  }
  
  /**
   * Update asset count displays
   */
  function updateAssetCounts() {
    // Update total count
    const totalCountElement = document.getElementById('total-assets-count');
    if (totalCountElement) {
      const ardorCount = 
        trackedAssets.ardor.regularCards.length +
        trackedAssets.ardor.specialCards.length +
        trackedAssets.ardor.specificTokens.length;
        
      const polygonCount = trackedAssets.polygon.tokens.length;
      
      totalCountElement.textContent = ardorCount + polygonCount;
    }
    
    // Update blockchain specific counts
    const ardorCountElement = document.getElementById('ardor-assets-count');
    if (ardorCountElement) {
      ardorCountElement.textContent = 
        trackedAssets.ardor.regularCards.length +
        trackedAssets.ardor.specialCards.length +
        trackedAssets.ardor.specificTokens.length;
    }
    
    const polygonCountElement = document.getElementById('polygon-assets-count');
    if (polygonCountElement) {
      polygonCountElement.textContent = trackedAssets.polygon.tokens.length;
    }
  }
  
  /**
   * Fetch and display assets
   */
  async function loadAssets() {
    try {
      if (assetsContainer) {
        assetsContainer.innerHTML = '<div class="loading">Loading assets...</div>';
      }
      
      const data = await fetchTrackedAssets();
      
      trackedAssets = data;
      
      renderAssets();
      
    } catch (error) {
      console.error('Error loading assets:', error);
      
      if (assetsContainer) {
        assetsContainer.innerHTML = `
          <div class="error-message">
            <p>Failed to load assets. Please try again later.</p>
            <p class="error-details">${error.message}</p>
            <button class="btn btn-sm btn-primary retry-btn">Retry</button>
          </div>
        `;
        
        // Add retry event listener
        const retryButton = assetsContainer.querySelector('.retry-btn');
        if (retryButton) {
          retryButton.addEventListener('click', loadAssets);
        }
      }
    }
  }
  
  // Set up event listeners for filters
  if (blockchainFilter) {
    blockchainFilter.addEventListener('change', renderAssets);
  }
  
  if (assetTypeFilter) {
    assetTypeFilter.addEventListener('change', renderAssets);
  }
  
  if (searchInput) {
    searchInput.addEventListener('input', renderAssets);
  }
  
  // Initial load
  loadAssets();
  
  // Set up refresh button if it exists
  const refreshButton = document.getElementById('refresh-assets');
  if (refreshButton) {
    refreshButton.addEventListener('click', loadAssets);
  }
  
  // Set up auto-refresh if needed
  let autoRefreshInterval;
  const autoRefreshToggle = document.getElementById('auto-refresh-assets');
  const autoRefreshTime = 60000; // 1 minute
  
  if (autoRefreshToggle) {
    autoRefreshToggle.addEventListener('change', function() {
      if (this.checked) {
        autoRefreshInterval = setInterval(loadAssets, autoRefreshTime);
      } else {
        clearInterval(autoRefreshInterval);
      }
    });
  }
  
  // Add view details event listener (delegation)
  if (assetsContainer) {
    assetsContainer.addEventListener('click', function(e) {
      const target = e.target;
      
      if (target.classList.contains('view-details')) {
        e.preventDefault();
        
        const id = target.getAttribute('data-id');
        const blockchain = target.getAttribute('data-blockchain');
        
        console.log(`View details for asset ${id} on ${blockchain}`);
        // Here you would typically show a modal or navigate to a details page
        // This is a placeholder for that functionality
        alert(`Asset details for ${id} on ${blockchain} would be shown here.`);
      }
    });
  }
}