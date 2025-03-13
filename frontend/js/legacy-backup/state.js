/**
 * Simple state management for the application
 */

const state = {
  data: {}, // All application data
  ui: {     // UI-specific state
    currentPeriod: 'all',
    activeTab: 'trades'
  }
};

export function getData(key) {
  return key ? state.data[key] : state.data;
}

export function setData(key, value) {
  state.data[key] = value;
  if (key === 'trades' || key === 'crafts' || key === 'burns') {
    // Trigger UI update for this data type
    updateUI(key);
  }
}

export function getUiState(key) {
  return key ? state.ui[key] : state.ui;
}

export function setUiState(key, value) {
  state.ui[key] = value;
}

function updateUI(dataType) {
  // Simple DOM-based updates
  const container = document.getElementById(`${dataType}-cards`);
  if (!container || !state.data[dataType]) return;
  
  // Clear container
  container.innerHTML = '';
  
  // Add items
  state.data[dataType].forEach(item => {
    const card = createCard(dataType, item);
    container.appendChild(card);
  });
}

function createCard(type, data) {
  // Create card based on type and data
  const template = document.getElementById(`${type}-card-template`);
  if (!template) return document.createElement('div');
  
  const card = template.content.cloneNode(true);
  
  // Populate card based on type
  switch(type) {
    case 'trades':
      card.querySelector('.card-name').textContent = data.cardName || 'Unknown Card';
      card.querySelector('.buyer-name').textContent = data.buyer || 'Unknown';
      card.querySelector('.seller-name').textContent = data.seller || 'Unknown';
      break;
    case 'crafts':
      card.querySelector('.card-name').textContent = data.cardName || 'Unknown Card';
      card.querySelector('.crafter-name').textContent = data.crafter || 'Unknown';
      break;
    // Add other cases as needed
  }
  
  if (data.timestamp) {
    card.querySelector('.transaction-time').textContent = 
      new Date(data.timestamp).toLocaleString();
  }
  
  return card;
}