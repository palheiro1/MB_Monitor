# MB Monitor - Simplified Architecture

This document outlines the simplified architecture implemented for MB Monitor, focusing on maintainability, reduced code duplication, and clearer data flow.

## Core Architecture Principles

1. **Single Responsibility**: Each module has a focused purpose
2. **Unified APIs**: Consolidated API endpoints with consistent patterns
3. **Centralized State Management**: Single source of truth for application state
4. **Standardized Rendering**: Common rendering logic for similar components
5. **Separation of Concerns**: Data fetching, processing, and rendering are separated

## Frontend Structure

### Core Components

- **`app-core.js`**: Application entry point and initialization
- **`state/index.js`**: Centralized application state management
- **`data-manager/unified-data-manager.js`**: Data fetching and processing
- **`api/blockchain-client.js`**: Unified API client with caching and error handling

### UI Components

- **`components/transaction-renderer.js`**: Unified renderer for all transaction types
- **`components/tab-controllers.js`**: Centralized tab content management
- **`components/charts.js`**: Chart creation and updates
- **`utils/formatters.js`**: Common formatting utilities

### Data Flow

```
User Action → App Core → Data Manager → API Client → Backend
   ↓                                      ↑
 Update UI ← State Management ← Process Data
```

## Backend Structure

### Core Components

- **`services/blockchainService.js`**: Unified blockchain interaction service
- **`api/unified-api.js`**: Consolidated API routes with consistent error handling
- **`utils/jsonStorage.js`**: Data caching and persistence
- **`utils/filters.js`**: Common data filtering utilities

### API Flow

```
Request → API Router → Blockchain Service → Chain-specific Services
   ↓
Response ← Data Transformation ← Cache Management
```

## Key Improvements

### 1. Reduced Code Duplication

- Consolidated duplicate API client implementations
- Unified transaction rendering logic
- Standardized formatting utilities
- Common filtering and processing functions

### 2. Simplified Data Flow

- Consistent API pattern across all endpoints
- Predictable state updates
- Centralized event handling
- Standardized error handling

### 3. Better Performance

- Improved caching strategy
- More efficient DOM updates
- Reduced unnecessary re-renders
- Better parallelization of API requests

### 4. Maintainability Improvements

- Clear module organization
- Consistent coding patterns
- Better documentation
- Reduced inter-module dependencies

## Directory Structure

```
frontend/
├── js/
│   ├── api/
│   │   └── blockchain-client.js     # Unified API client
│   ├── components/
│   │   ├── charts.js                # Chart visualizations
│   │   ├── tab-controllers.js       # Tab management
│   │   └── transaction-renderer.js  # Transaction UI rendering
│   ├── data-manager/
│   │   └── unified-data-manager.js  # Data management
│   ├── state/
│   │   └── index.js                 # State management
│   ├── utils/
│   │   └── formatters.js            # Formatting utilities
│   └── app-core.js                  # Application entry point
│
backend/
├── api/
│   └── unified-api.js               # Unified API router
├── services/
│   ├── blockchainService.js         # Blockchain service
│   ├── ardor/                       # Ardor chain services
│   └── polygon/                     # Polygon chain services
└── utils/
    ├── filters.js                   # Data filtering
    └── jsonStorage.js               # Persistent storage
```

## Migration Guide

When enhancing the application, follow these principles:

1. Add new blockchain data sources to `blockchainService.js`
2. Add new API endpoints to `unified-api.js`
3. Extend the unified data manager for any new data types
4. Use the transaction renderer for new transaction types
5. Update the state structure in `state/index.js` for new data fields

## Legacy Code Handling

The application maintains backward compatibility while phasing out older components. Legacy files should be gradually deprecated and removed as features are migrated to the new architecture.