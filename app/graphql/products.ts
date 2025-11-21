export const ProductQuery = `#graphql
  query GetProducts($first: Int, $after: String, $last: Int, $before: String, $query: String) {
    products(first: $first, after: $after, last: $last, before: $before, query: $query) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        id
        title
        featuredImage {
          url
        }
        options {
          id
          name
          values
        }
        variants(first: 100) {
          nodes {
            id
            title
            price
            selectedOptions {
              name
              value
            }
            inventoryItem {
              id
              unitCost {
                amount
              }
              inventoryHistoryUrl
            }
            inventoryQuantity
          }
        }
      }
    }
  }
`;

export const InventoryItemUpdateMutation = `#graphql
    mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
        inventoryItemUpdate(id: $id, input: $input) {
            userErrors {
                message
            }
        }
    }
`;
