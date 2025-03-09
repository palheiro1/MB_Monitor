// Make sure ARDOR_NODE is properly set
const ARDOR_NODE = process.env.ARDOR_NODE || 'https://ardor.jelurida.com';

module.exports = {
  // Polygon configuration
  POLYGON_API_URL: 'https://api.polygonscan.com/api',
  ALCHEMY_API_URL: 'https://polygon-mainnet.g.alchemy.com/v2',
  ALCHEMY_API_KEY: 'KGbtj9EXEXr5LBBU7SnlFYznirnOcos7', // Replace with your actual API key
  MB_CONTRACT_ADDRESS: '0xcf55f528492768330c0750a6527c1dfb50e2a7c3',
  
  // Ardor configuration
  ARDOR_API_URL: 'http://localhost:27876/nxt',
  ARDOR_BURN_ACCOUNT: 'ARDOR-Q9KZ-74XD-WERK-CV6GB',
  REGULAR_CARDS_ISSUER: 'ARDOR-4V3B-TVQA-Q6LF-GMH3T',
  SPECIAL_CARDS_ISSUER: 'ARDOR-5NCL-DRBZ-XBWF-DDN5T',
  ARDOR_CHAIN_ID: 2, // IGNIS chain ID
  TOKEN_IDS: [
    '935701767940516955',
    '2188455459770682500', 
    '13993107092599641878',
    '10230963490193589789'
  ],
  GEM_ASSET_ID: '10230963490193589789',
  
  // General configuration
  CACHE_TTL: 300, // 5 minutes in seconds
  
  // Date constants
  BURN_START_DATE: '2022-01-01T00:00:00Z',
  
  ARDOR_NODE
};
