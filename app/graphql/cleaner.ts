export const GetResourceTagsQuery = (resourceType: "products" | "customers") => `#graphql
  query get${resourceType}($cursor: String, $first: Int!) {
    ${resourceType}(first: $first, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        tags
      }
    }
  }
`;

export const ProductUpdateMutation = `#graphql
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        tags
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CustomerUpdateMutation = `#graphql
  mutation customerUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer {
        id
        tags
      }
      userErrors {
        field
        message
      }
    }
  }
`;
