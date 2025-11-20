# Shop-Ops Suite

Shop-Ops Suite is a comprehensive Shopify App designed to streamline store operations through automation, data management, and AI-powered insights. Built with the Remix framework and following a robust Layered Architecture, it provides a scalable solution for merchants to manage their shop's data effectively.

## 🚀 Features

### 1. 📊 Dashboard & AI Advisor
- **Real-time Statistics**: View key metrics like total orders, products, and customers.
- **AI Insights**: Get intelligent suggestions for inventory management and marketing based on your shop's data.
- **Active Rules Overview**: Monitor active automation rules at a glance.

### 2. 🏷️ Smart Tagger
- **Automated Tagging**: Create rules to automatically tag orders and customers based on specific conditions (e.g., "VIP Customer" if spend > $500).
- **Webhook Integration**: Rules are evaluated in real-time as events occur in your store.
- **Pre-built Recipes**: Quickly enable common tagging scenarios.

### 3. 💰 COGS & Profit Tracking
- **Cost Management**: Easily input and manage Cost of Goods Sold (COGS) for all your products and variants.
- **Margin Analysis**: Visualize profit margins and identify low-margin products.
- **Bulk Editing**: Update costs for multiple variants efficiently.

### 4. 🗃️ Metafield Manager
- **Automation Rules**: Automatically set metafield values on products or customers when they are created.
- **Condition Logic**: Apply metafields only when specific criteria are met (e.g., Set "Material: Cotton" if Vendor is "Nike").
- **Supported Types**: Text, Integer, Decimal, and JSON.

### 5. 🧹 Data Cleaner
- **Deep Scan**: AI-powered scanning of products and customers to identify messy data.
- **Duplicate Detection**: Find and merge case-insensitive duplicate tags (e.g., "Sale" vs "sale").
- **Cleanup Jobs**: Bulk remove unwanted or malformed tags via background processing.

### 6. 📜 Activity Log
- **Audit Trail**: Keep track of all automated actions performed by the app.
- **Status Monitoring**: View the success/failure status of background jobs and rule executions.

## 🏗️ Architecture

The application follows a **Layered Architecture** (Service-Repository Pattern) to ensure separation of concerns and testability:

- **Presentation Layer (`app/routes`)**: Handles HTTP requests, input validation, and UI rendering using Shopify Polaris components.
- **Business Layer (`app/services`)**: Contains the core business logic, independent of the web framework.
- **Data Access Layer (`app/models`, `app/graphql`)**: Manages interactions with MongoDB (Mongoose) and Shopify Admin API (GraphQL).
- **Infrastructure**:
    - **Database**: MongoDB for storing rules, logs, and configuration.
    - **Queue**: Redis & BullMQ for handling background jobs (webhooks, data cleaning).

## 🛠️ Tech Stack

- **Framework**: [Remix](https://remix.run/)
- **UI Library**: [Shopify Polaris](https://polaris.shopify.com/)
- **Database**: MongoDB (Mongoose)
- **Job Queue**: Redis + BullMQ
- **Testing**: Vitest
- **Package Manager**: pnpm

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB instance
- Redis instance
- Shopify Partner Account

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd Shop-Ops-Suite
    ```

2.  **Install dependencies**
    ```bash
    pnpm install
    ```

3.  **Environment Variables**
    Copy `.env.example` to `.env` and fill in the required values:
    ```env
    SHOPIFY_API_KEY=your_api_key
    SHOPIFY_API_SECRET=your_api_secret
    SCOPES=write_products,write_customers,write_orders,read_all_orders
    HOST=https://your-app-url.com
    MONGODB_URI=mongodb://localhost:27017/shop-ops
    REDIS_URL=redis://localhost:6379
    ```

4.  **Run the app**
    ```bash
    pnpm dev
    ```

### Running Tests

Run the unit test suite:
```bash
pnpm test
```

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

---

Built with ❤️ for Shopify Merchants.
