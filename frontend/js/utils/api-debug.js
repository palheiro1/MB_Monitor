/**
 * API Debug Utility
 * 
 * Helps debug API issues by providing enhanced fetch functionality
 * with detailed logging and error handling.
 */

/**
 * Enhanced fetch function with debugging
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise} - Promise resolving to response
 */
export async function debugFetch(url, options = {}) {
  console.log(`🌐 Fetching: ${url}`);
  console.log('Options:', options);
  
  try {
    const startTime = performance.now();
    const response = await fetch(url, options);
    const endTime = performance.now();
    
    console.log(`✅ Response received in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Headers:', Object.fromEntries([...response.headers.entries()]));

    // Clone response to not consume it
    const clonedResponse = response.clone();
    
    try {
      // Try to parse as JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const json = await clonedResponse.json();
        console.log('JSON response:', json);
        return response;
      } else {
        // Not JSON, log as text
        const text = await clonedResponse.text();
        console.log(`Non-JSON response (${contentType}):\n`, text);
        return response;
      }
    } catch (parseError) {
      console.error('❌ Error parsing response:', parseError);
      // Try to get the raw text
      const text = await response.text();
      console.error('Raw response text:', text);
      throw parseError;
    }
  } catch (fetchError) {
    console.error('❌ Fetch error:', fetchError);
    throw fetchError;
  }
}

/**
 * Fetch data with debugging
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise} - Promise resolving to parsed data
 */
export async function fetchData(url, options = {}) {
  const response = await debugFetch(url, options);
  
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  } else {
    const text = await response.text();
    try {
      // Try to parse as JSON anyway in case Content-Type is incorrect
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}
