export const ProductQuery = `#graphql
  query GetProducts($first: Int, $after: String, $last: Int, $before: String) {
    products(first: $first, after: $after, last: $last, before: $before) {
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
            }
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
