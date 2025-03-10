/**
 * Error Handler Component
 * 
 * Provides UI for displaying errors and error recovery
 */

/**
 * Display error in UI with recovery options
 * @param {Error} error - The error that occurred
 * @param {Function} retryFn - Function to call to retry the operation
 */
export function displayError(error, retryFn) {
  console.error('Error caught by handler:', error);
  
  // Create error panel if it doesn't exist
  let errorPanel = document.getElementById('error-panel');
  if (!errorPanel) {
    errorPanel = document.createElement('div');
    errorPanel.id = 'error-panel';
    errorPanel.className = 'error-panel alert alert-danger';
    document.body.prepend(errorPanel);
  }
  
  // Add error message
  errorPanel.innerHTML = `
    <h4><i class="fas fa-exclamation-triangle me-2"></i>Error Loading Data</h4>
    <p class="mb-2">${error.message}</p>
    <div class="error-actions">
      <button class="btn btn-sm btn-outline-danger retry-btn">
        <i class="fas fa-sync-alt me-1"></i> Retry
      </button>
      <button class="btn btn-sm btn-outline-secondary dismiss-btn">
        <i class="fas fa-times me-1"></i> Dismiss
      </button>
    </div>
  `;
  
  // Show the error panel
  errorPanel.style.display = 'block';
  
  // Add event listeners
  const retryBtn = errorPanel.querySelector('.retry-btn');
  if (retryBtn && retryFn) {
    retryBtn.addEventListener('click', () => {
      errorPanel.style.display = 'none';
      retryFn();
    });
  }
  
  const dismissBtn = errorPanel.querySelector('.dismiss-btn');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      errorPanel.style.display = 'none';
    });
  }
}

/**
 * Add CSS styles for error panel
 */
export function addErrorStyles() {
  // Check if styles already exist
  if (document.getElementById('error-handler-styles')) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'error-handler-styles';
  
  style.textContent = `
    .error-panel {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.2);
      width: 90%;
      max-width: 500px;
      display: none;
    }
    .error-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 10px;
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Initialize error handling
 */
export function initErrorHandling() {
  addErrorStyles();
  
  // Add global error handling for uncaught promises
  window.addEventListener('unhandledrejection', (event) => {
    displayError(event.reason, () => {
      window.location.reload();
    });
    event.preventDefault();
  });
}
