# Legacy Code Migration Plan

This document outlines how legacy code will be gradually migrated to the new architecture as described in the simplified-architecture.md document.

## Legacy Files to New Architecture Mapping

| Legacy File | New Architecture Component | Migration Status | Notes |
|-------------|----------------------------|------------------|-------|
| `frontend/js/app.js` | `frontend/js/app-core.js` | In Progress | Main application entry point |
| `frontend/js/api-connector.js` | `frontend/js/api/blockchain-client.js` | Not Started | API client implementation |
| `frontend/js/data.js` | `frontend/js/data-manager/unified-data-manager.js` | Not Started | Data fetching and processing |
| `frontend/js/components/transactions/burns.js` | `frontend/js/components/transaction-renderer.js` | Not Started | Burns rendering |
| `frontend/js/components/transactions/crafts.js` | `frontend/js/components/transaction-renderer.js` | Not Started | Crafts rendering |
| `frontend/js/components/transactions/trades.js` | `frontend/js/components/transaction-renderer.js` | Not Started | Trades rendering |

## Migration Process

For each legacy component, follow these steps:

1. **Analyze**: Identify the core functionality in the legacy file
2. **Refactor**: Move the functionality to the appropriate new architecture component
3. **Test**: Ensure the functionality works correctly in the new structure
4. **Deprecate**: Mark the legacy file as deprecated with a notice pointing to the new component
5. **Remove**: After a reasonable transition period and thorough testing, remove the legacy file

## Deprecation Notice Template

Add the following to the top of legacy files during migration:

```javascript
/**
 * @deprecated This file is being phased out in favor of {new file path}.
 * Please use the new component for all new development.
 * This file will be removed in a future update.
 */
```

## Priority Order

1. First migrate core application components (`app.js` → `app-core.js`)
2. Next migrate API clients and data management
3. Then migrate UI rendering components
4. Finally migrate utilities

## Testing Strategy

For each migration:
1. Test the new implementation independently
2. Test with the new implementation while legacy code is still available
3. Test with the legacy code completely removed