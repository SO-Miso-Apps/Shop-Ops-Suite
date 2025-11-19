# Shop-Ops Suite

**The all-in-one backend toolkit that automates 90% of your admin workflows, cleans your data, and saves you hours of manual work every week.**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](CHANGELOG.md)
[![Status](https://img.shields.io/badge/status-Phase%200%20Complete-green.svg)](docs/PRD.md)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🎯 What is Shop-Ops Suite?

Shop-Ops Suite is a Shopify Admin App that consolidates essential backend operations into one powerful, easy-to-use platform. Built with the "Recipes, Not Rules" philosophy, it makes powerful automation accessible to non-technical merchants while maintaining zero impact on storefront performance.

### ✨ Key Features

- **🏷️ Smart Tagger** - 20+ pre-built automation recipes for products, customers, and orders
- **🔧 Metafield Manager** - Automated metafield population and COGS entry interface *(Phase 2)*
- **🧹 Data Cleaner** - Tag cleanup, data audits, and maintenance tools *(Phase 2)*
- **⚡ Bulk Operations** - Safe, powerful Find & Replace for bulk tasks *(Phase 3)*
- **📋 Activity Log** - Complete transparency with comprehensive action logging
- **⚙️ Settings** - Plan management, usage tracking, and preferences

### 🚀 Core Promise

**"Zero Impact on Storefront Speed"** - All operations run 100% server-side. No frontend JavaScript. No theme modifications.

---

## 📚 Documentation

- **[Product Requirements Document (PRD)](docs/PRD.md)** - Complete product vision and requirements
- **[Technical Architecture](docs/ARCHITECTURE.md)** - System design and implementation details
- **[UI/UX Design](docs/UI_UX_DESIGN.md)** - Interface specifications and user flows
- **[Changelog](CHANGELOG.md)** - Version history and release notes

---

## 🛠️ Tech Stack

### Frontend
- **Shopify Polaris v13.9.5** - React component library for native Shopify UI
- **Shopify App Bridge v4.1.6** - Embedded app integration
- **React 18.2.0** - UI library with concurrent features
- **TypeScript 5.2.2** - Full type safety
- **Zustand 5.0.8** - Lightweight state management

### Backend
- **Remix v2.16.1** - Full-stack React framework with SSR
- **Node.js 18.20+** - JavaScript runtime (supports up to v21+)
- **MongoDB** - Primary NoSQL database via Mongoose 8.19.4
- **Redis** - Session storage, job queue, caching
- **TypeScript 5.2.2** - Type-safe backend code

### Build & Development
- **Vite 6.2.2** - Modern bundler with fast HMR
- **pnpm** - Fast, efficient package manager
- **GraphQL Code Generator** - Type-safe GraphQL operations
- **Docker** - Containerized deployment

### Shopify Integration
- **@shopify/shopify-app-remix v3.7.0** - Core authentication and API integration
- **@shopify/shopify-app-session-storage-redis v5.0.2** - Redis session storage
- **Shopify Admin API** - January 2025 GraphQL API version

---

## 🚦 Quick Start

### Prerequisites

Before you begin, ensure you have:

1. **Node.js 18.20+** - [Download and install](https://nodejs.org/)
2. **pnpm** - Install globally: `npm install -g pnpm`
3. **MongoDB** - Running instance (local or cloud)
4. **Redis** - Running instance (local or cloud)
5. **Shopify Partner Account** - [Create account](https://partners.shopify.com/signup)
6. **Shopify CLI** - Install globally: `npm install -g @shopify/cli@latest`
7. **Development Store** - [Create a development store](https://help.shopify.com/en/partners/dashboard/development-stores)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourorg/shop-ops-suite.git
   cd shop-ops-suite
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   # Shopify App Credentials
   SHOPIFY_API_KEY=your_api_key
   SHOPIFY_API_SECRET=your_api_secret
   SCOPES=write_products,write_customers,write_orders,write_draft_orders

   # Database
   MONGODB_URL=mongodb://localhost:27017/shopops
   REDIS_URL=redis://localhost:6379

   # App URL (for local dev, Shopify CLI provides this)
   SHOPIFY_APP_URL=https://your-tunnel-url.ngrok.io
   ```

4. **Start MongoDB and Redis** (using Docker)
   ```bash
   docker-compose up -d mongodb redis
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

   This will:
   - Start the Shopify CLI tunnel
   - Launch the Remix dev server with HMR
   - Open your browser to install the app

### First-Time Setup

When you first run the app:

1. The Shopify CLI will prompt you to log in to your Partner account
2. Select your app (or create a new one)
3. Select your development store
4. Install the app in your store
5. The app will open in the Shopify Admin

---

## 📁 Project Structure

```
Shop-Ops-Suite/
├── app/                              # Main application code
│   ├── routes/                       # Remix file-based routing
│   │   ├── app.tsx                  # ✅ Main app layout (authenticated)
│   │   ├── app._index.tsx           # ✅ Dashboard page
│   │   ├── auth.login/              # ✅ Login page
│   │   ├── webhooks.*.tsx           # ✅ Webhook handlers
│   │   └── ...                      # ⏳ Feature routes (planned)
│   │
│   ├── models/                       # ⏳ Mongoose schemas (planned)
│   │   ├── Recipe.ts                # Recipe automation rules
│   │   ├── Setting.ts               # Shop settings
│   │   ├── AutomationLog.ts         # Audit trail
│   │   └── Shop.ts                  # Shop metadata
│   │
│   ├── services/                     # ⏳ Business logic (planned)
│   │   ├── recipeEngine.ts          # Core recipe evaluation
│   │   ├── tagService.ts            # Tag management
│   │   ├── metafieldService.ts      # Metafield operations
│   │   └── webhookProcessor.ts      # Webhook processing
│   │
│   ├── jobs/                         # ⏳ BullMQ job definitions (planned)
│   │   ├── recipeExecutor.ts        # Execute recipe jobs
│   │   └── scheduledTasks.ts        # Cron-based recurring jobs
│   │
│   ├── utils/                        # ⏳ Shared utilities (planned)
│   │   ├── shopifyApi.ts            # GraphQL client wrapper
│   │   └── validators.ts            # Input validation
│   │
│   ├── shopify.server.ts             # ✅ Shopify app config
│   ├── mongoose.server.ts            # ✅ MongoDB connection
│   ├── root.tsx                      # ✅ Root HTML layout
│   └── entry.server.tsx              # ✅ SSR entry point
│
├── docs/                             # Documentation
│   ├── PRD.md                       # Product requirements
│   ├── ARCHITECTURE.md              # Technical architecture
│   └── UI_UX_DESIGN.md              # Interface design specs
│
├── public/                           # Static assets
├── package.json                      # Dependencies
├── vite.config.ts                    # Vite configuration
├── tsconfig.json                     # TypeScript config
├── Dockerfile                        # Docker deployment
├── docker-compose.yml                # Local development stack
└── README.md                         # This file
```

---

## 🔧 Development

### Available Commands

```bash
# Development
pnpm dev                  # Start dev server with Shopify CLI
pnpm dev:remix            # Start Remix dev server only

# Build
pnpm build                # Production build
pnpm start                # Start production server

# Code Quality
pnpm lint                 # ESLint check
pnpm format               # Prettier format
pnpm type-check           # TypeScript check

# GraphQL
pnpm graphql:codegen      # Generate TypeScript types from GraphQL

# Database (planned)
pnpm db:seed              # Seed database with sample data
pnpm db:reset             # Reset database

# Testing (planned)
pnpm test                 # Run all tests
pnpm test:unit            # Unit tests
pnpm test:integration     # Integration tests
pnpm test:e2e             # End-to-end tests
```

### Development Workflow

1. **Make changes** to code in `app/` directory
2. **Hot Module Reload (HMR)** will automatically update the browser
3. **Type checking** happens in your editor (VS Code recommended)
4. **Linting** runs on save (configure in `.vscode/settings.json`)
5. **Test** your changes in the embedded Shopify Admin

### GraphQL Development

We use GraphQL Code Generator for type-safe API calls:

```bash
# Generate types from GraphQL operations
pnpm graphql:codegen
```

This creates TypeScript types in `app/types/admin.generated.d.ts` based on your GraphQL queries and mutations.

**Example:**
```typescript
// app/routes/app._index.tsx
import type { CreateProductMutation } from "~/types/admin.generated";

export async function action({ request }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      mutation CreateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
          }
        }
      }`,
    {
      variables: {
        input: { title: "New Product" }
      }
    }
  );

  const data: CreateProductMutation = await response.json();
  return json(data);
}
```

---

## 🏗️ Current Implementation Status

### ✅ Phase 0: Foundation (100% Complete)

**Delivered:**
- Complete Shopify OAuth 2.0 integration
- Embedded app framework (App Bridge v4.1.6)
- Server-side rendering (Remix + React 18)
- Session management (Redis-based, scalable)
- Database infrastructure (MongoDB via Mongoose)
- Webhook system foundation
- GraphQL API integration (January 2025 version)
- Polaris UI components (v13.9.5)
- Full TypeScript configuration
- Docker deployment setup

### 🚧 Phase 1: MVP (15% Complete - In Progress)

**Next Deliverables:**
- [ ] Module 1: Smart Tagger with 10 recipes
- [ ] Module 5: Activity Log (basic version)
- [ ] Recipe toggle UI (On/Off switches)
- [ ] Webhook handlers for products/customers/orders
- [ ] Job queue system (BullMQ + Redis workers)
- [ ] MongoDB schemas (Recipe, Setting, AutomationLog, Shop)
- [ ] Recipe execution engine

**Target Completion:** Q1 2026

### 📋 Future Phases

- **Phase 2** (Months 4-6): Metafield Manager, Data Cleaner, Pro plan
- **Phase 3** (Months 7-9): Bulk Operations, advanced features
- **Phase 4** (Months 10-12): Enterprise features, multi-store dashboard

See [PRD.md](docs/PRD.md) for complete roadmap.

---

## 🚀 Deployment

### Environment Variables

Production environment requires:

```env
NODE_ENV=production
SHOPIFY_API_KEY=your_production_api_key
SHOPIFY_API_SECRET=your_production_api_secret
SCOPES=write_products,write_customers,write_orders,write_draft_orders
SHOPIFY_APP_URL=https://your-app.com
MONGODB_URL=mongodb://user:pass@host:27017/shopops?replicaSet=rs0
REDIS_URL=redis://user:pass@host:6379
```

### Docker Deployment

1. **Build Docker image**
   ```bash
   docker build -t shop-ops-suite:latest .
   ```

2. **Run with docker-compose**
   ```bash
   docker-compose up -d
   ```

3. **Check logs**
   ```bash
   docker-compose logs -f web
   ```

### Cloud Deployment

Supported platforms:
- **AWS** (ECS, Elastic Beanstalk)
- **Google Cloud** (Cloud Run, App Engine)
- **DigitalOcean** (App Platform)
- **Heroku**
- **Fly.io**

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed deployment strategies.

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (interactive)
pnpm test

# Run tests with UI
pnpm test:ui

# Generate coverage report
pnpm test:coverage

# Run specific test file
pnpm test -- conditionEvaluator.test.ts

# Run tests in CI mode (no watch)
pnpm test --run
```

### Test Stack

- **Vitest v4.0.10** - Fast unit testing with native ESM support
- **Testing Library** - Component testing utilities
- **Happy DOM** - Lightweight DOM environment for tests
- **@testing-library/jest-dom** - Custom DOM matchers

### Test Structure

```
app/
├── services/
│   ├── conditionEvaluator.ts
│   ├── conditionEvaluator.test.ts    # ✅ 38 tests
│   ├── actionExecutor.ts
│   └── actionExecutor.test.ts        # ✅ 16 tests
test/
└── setup.ts                           # Test configuration
vitest.config.ts                       # Vitest configuration
```

### Current Test Coverage

- **Condition Evaluator**: 38 tests covering all operators and data types
- **Action Executor**: 16 tests covering tag operations, metafields, and error handling
- **Total**: 54 tests passing

---

## 🐛 Troubleshooting

### MongoDB Connection Issues

**Error:** `MongooseServerSelectionError: connect ECONNREFUSED`

**Solution:**
1. Ensure MongoDB is running: `docker-compose ps`
2. Check connection string in `.env`
3. Verify network connectivity: `docker network ls`

### Redis Connection Issues

**Error:** `Error: Redis connection to localhost:6379 failed`

**Solution:**
1. Ensure Redis is running: `docker-compose ps redis`
2. Check REDIS_URL in `.env`
3. Test connection: `redis-cli ping`

### Webhook HMAC Validation Failures

**Error:** `Webhook HMAC validation failed`

**Solution:**
1. Webhooks must be registered in `shopify.app.toml`
2. Use app-specific webhooks (not manually created in admin)
3. Test with Shopify CLI: `shopify app webhook trigger`

### OAuth Loop Issues

**Error:** OAuth keeps redirecting after scope changes

**Solution:**
1. Update scopes in `shopify.app.toml`
2. Deploy changes: `pnpm deploy`
3. Uninstall and reinstall app in development store

### GraphQL Type Generation Issues

**Error:** Types not updating after changing queries

**Solution:**
```bash
# Regenerate types
pnpm graphql:codegen

# Restart dev server
pnpm dev
```

---

## 📖 Resources

### Documentation
- [Shopify App Development](https://shopify.dev/docs/apps)
- [Remix Framework](https://remix.run/docs)
- [Polaris Design System](https://polaris.shopify.com/)
- [Shopify Admin API](https://shopify.dev/docs/api/admin-graphql)
- [Shopify App Bridge](https://shopify.dev/docs/api/app-bridge)

### Tools
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli)
- [GraphQL Code Generator](https://www.graphql-code-generator.com/)
- [MongoDB Compass](https://www.mongodb.com/products/compass) - GUI for MongoDB
- [RedisInsight](https://redis.io/insight/) - GUI for Redis

### Community
- [Shopify Community Forums](https://community.shopify.com/)
- [Shopify Discord](https://discord.gg/shopifydevs)
- [GitHub Issues](https://github.com/yourorg/shop-ops-suite/issues)

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines (coming soon).

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Commit: `git commit -m 'feat: Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: Add new recipe for VIP customers
fix: Resolve webhook HMAC validation
docs: Update architecture documentation
refactor: Simplify tag service logic
test: Add unit tests for recipe engine
chore: Update dependencies
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Shopify App Template - Remix](https://github.com/Shopify/shopify-app-template-remix)
- Uses [Shopify Polaris](https://polaris.shopify.com/) design system
- Powered by [Remix](https://remix.run/) framework

---

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourorg/shop-ops-suite/issues)
- **Email**: support@shop-ops-suite.com (placeholder)
- **Discord**: Coming soon

---

**Made with ❤️ for Shopify merchants who want to automate their backend operations**

---

## 🗺️ Roadmap

### Q1 2026 - MVP Launch
- Smart Tagger with 10 recipes
- Activity Log
- Free plan only
- 100+ installs target

### Q2 2026 - Feature Expansion
- Metafield Manager
- Data Cleaner
- Pro plan launch ($19.99/month)
- 500+ installs target

### Q3 2026 - Power Features
- Bulk Operations
- Recipe customization
- Scheduled operations
- 1,500+ installs target

### Q4 2026 - Scale & Enterprise
- Multi-store dashboard
- Enterprise plan
- Advanced analytics
- 3,000+ installs target

See [PRD.md](docs/PRD.md) for detailed roadmap.
