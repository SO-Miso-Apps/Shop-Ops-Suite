export const ShopDataQuery = `#graphql
  query ShopData {
    shop {
      name
      currencyCode
      billingAddress {
        countryCode
      }
    }
    ordersCount {
      count
    }
    productsCount {
      count
    }
  }
`;

export const RecentOrdersQuery = `#graphql
  query RecentOrders {
    orders(first: 20, sortKey: CREATED_AT, reverse: true) {
      nodes {
        shippingAddress {
          countryCode
        }
      }
    }
  }
`;

export const RecentProductsQuery = `#graphql
  query RecentProducts {
    products(first: 20, sortKey: CREATED_AT, reverse: true) {
      nodes {
        variants(first: 1) {
          nodes {
            inventoryItem {
              unitCost {
                amount
              }
            }
          }
        }
      }
    }
  }
`;
