# Naming Conventions

## Backend Services

- All data retrieval functions should use the pattern `get[EntityName]([options])`
  - Examples: `getTrackedAssets()`, `getCardBurns(forceRefresh, period)`
- All data modification functions should use the pattern `[action][EntityName]([params])`
  - Examples: `updateUserPreference()`, `deleteTradeRecord()`

## Frontend Components

- Component files should be named with kebab-case and match their functionality
  - Examples: `trades-renderer.js`, `chart-manager.js`
- Component functions should use camelCase
  - Examples: `renderTradeCards()`, `updateChartData()`

## API Routes

- API endpoint paths should be kebab-case
  - Examples: `/api/tracked-assets`, `/api/card-burns`
- Route handler functions should use camelCase and describe the action
  - Examples: `getTradesForPeriod`, `updateUserPreferences`
