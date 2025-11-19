# Project Overview

This is a Shopify Admin App called **Shop-Ops Suite**. It's designed to automate backend operations for Shopify merchants. The app is built with a "Recipes, Not Rules" philosophy, making automation accessible to non-technical users without impacting storefront performance.

**Key Features:**
- **Smart Tagger:** Automates tagging for products, customers, and orders.
- **Metafield Manager:** Manages metafields and cost of goods sold (COGS).
- **Data Cleaner:** Cleans up tags and other data.
- **Bulk Operations:** Provides find and replace functionality for bulk tasks.
- **Activity Log:** Logs all actions for transparency.

**Architecture:**
The project follows a modern full-stack TypeScript architecture:
- **Frontend:** Built with React, Shopify Polaris, and Zustand for state management. It's a single-page application embedded within the Shopify Admin.
- **Backend:** A Remix application running on Node.js. It uses MongoDB as the primary database (with Mongoose) and Redis for session storage and job queuing (with BullMQ).
- **Shopify Integration:** It uses the Shopify App Bridge and the Shopify Admin GraphQL API.

# Building and Running

The project uses `pnpm` as the package manager.

**Prerequisites:**
- Node.js 18.20+
- pnpm
- MongoDB
- Redis
- Shopify Partner Account
- Shopify CLI

**Development:**
To run the app in development mode:
```bash
pnpm dev
```
This command starts the Shopify CLI, which handles the development server and tunneling.

**Build:**
To build the app for production:
```bash
pnpm build
```

**Testing:**
To run the test suite:
```bash
pnpm test
```
The project uses Vitest for testing.

**Linting and Formatting:**
- To run ESLint: `pnpm lint`
- To format code with Prettier: `pnpm format`
- To run the TypeScript compiler: `pnpm type-check`

**GraphQL:**
To generate TypeScript types from GraphQL queries:
```bash
pnpm graphql:codegen
```

# Development Conventions

- **Commit Messages:** The project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.
- **Branching:** Feature branches should be created from the main branch and named using the `feature/amazing-feature` convention.
- **Code Style:** The project uses Prettier for code formatting and ESLint for linting.
- **Testing:** The project uses Vitest for unit and integration testing. Tests are located next to the files they are testing (e.g., `conditionEvaluator.test.ts` is next to `conditionEvaluator.ts`).
