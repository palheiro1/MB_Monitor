# MB Monitor Documentation

## Architecture

MB Monitor is a full-stack application that monitors Mythical Beings NFT activity across multiple blockchains. The application consists of:

1. **Backend Service**: Node.js application that fetches, processes, and caches blockchain data
2. **Frontend Application**: Browser-based dashboard for visualizing NFT activity
3. **Caching System**: File-based and in-memory caching for performance optimization

## Key Components

### Backend

- **API Routes**: Express routes for data access
- **Blockchain Services**: Modules for interacting with Ardor and Polygon
- **Cache Management**: System for efficient data storage and retrieval
- **Data Processing**: Utilities for transforming blockchain data

### Frontend

- **UI Components**: Reusable view components
- **Data Fetchers**: Services for retrieving data from backend
- **State Management**: Centralized application state
- **Charts**: Data visualization components

## Getting Started

1. **Development Setup**: See [development.md](./development.md)
2. **API Documentation**: See [api.md](./api.md)
3. **Deployment Guide**: See [deployment.md](./deployment.md)

## Contributing

Please review our [coding-standards.md](./coding-standards.md) and [naming-conventions.md](./naming-conventions.md) before submitting contributions.
