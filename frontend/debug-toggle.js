/**
 * Utility to toggle debug mode and handle infinite loop detection
 */
(function() {
  // Create a debug control panel
  const createDebugPanel = () => {
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.bottom = '10px';
    panel.style.right = '10px';
    panel.style.zIndex = '9999';
    panel.style.backgroundColor = 'rgba(0,0,0,0.7)';
    panel.style.color = 'white';
    panel.style.padding = '10px';
    panel.style.borderRadius = '5px';
    panel.innerHTML = `
      <h5>Debug Controls</h5>
      <button id="stop-api-calls" class="btn btn-danger btn-sm mb-2">Stop All API Calls</button>
      <div>
        <button id="limit-api-calls" class="btn btn-warning btn-sm">Limit API Calls</button>
        <input type="number" id="api-call-limit" value="100" min="1" max="1000" class="form-control form-control-sm mt-1">
      </div>
    `;
    document.body.appendChild(panel);
    
    // Add event listeners
    document.getElementById('stop-api-calls').addEventListener('click', () => {
      window.stopAllApiCalls = true;
      console.log('[DEBUG-TOGGLE] All API calls disabled');
      alert('All API calls have been disabled. Refresh the page to re-enable.');
    });
    
    document.getElementById('limit-api-calls').addEventListener('click', () => {
      const limit = parseInt(document.getElementById('api-call-limit').value);
      window.apiCallLimit = limit;
      console.log(`[DEBUG-TOGGLE] API calls limited to ${limit} per endpoint`);
      alert(`API calls have been limited to ${limit} per endpoint.`);
    });
  };
  
  // Add to window load event
  window.addEventListener('load', () => {
    createDebugPanel();
    
    // Override the fetch API to respect our debug controls
    const debugFetch = window.fetch;
    window.fetch = function(resource, init) {
      if (window.stopAllApiCalls && typeof resource === 'string' && 
          (resource.includes('/api') || resource.includes('getTransaction'))) {
        console.warn('[DEBUG-TOGGLE] API call blocked:', resource);
        return Promise.reject(new Error('API calls disabled by debug toggle'));
      }
      return debugFetch.apply(this, arguments);
    };
    
    console.log('[DEBUG-TOGGLE] Debug controls initialized');
  });
})();
