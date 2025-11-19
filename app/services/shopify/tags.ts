import type { AdminApiContext } from '@shopify/shopify-app-remix/server';

/**
 * Add tags to a Shopify resource.
 *
 * @param admin - Shopify Admin API context
 * @param resourceId - Shopify GID (e.g., "gid://shopify/Customer/123")
 * @param tags - Array of tags to add
 * @returns Success status and any errors
 */
export async function addTags(
  admin: AdminApiContext,
  resourceId: string,
  tags: string[]
): Promise<{ success: boolean; errors?: string[] }> {
  const response = await admin.graphql(
    `#graphql
      mutation tagsAdd($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) {
          node {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        id: resourceId,
        tags,
      },
    }
  );

  const data = await response.json();
  const result = data.data?.tagsAdd;

  if (result?.userErrors?.length > 0) {
    return {
      success: false,
      errors: result.userErrors.map((e: any) => e.message),
    };
  }

  return { success: true };
}

/**
 * Remove tags from a Shopify resource.
 *
 * @param admin - Shopify Admin API context
 * @param resourceId - Shopify GID (e.g., "gid://shopify/Customer/123")
 * @param tags - Array of tags to remove
 * @returns Success status and any errors
 */
export async function removeTags(
  admin: AdminApiContext,
  resourceId: string,
  tags: string[]
): Promise<{ success: boolean; errors?: string[] }> {
  const response = await admin.graphql(
    `#graphql
      mutation tagsRemove($id: ID!, $tags: [String!]!) {
        tagsRemove(id: $id, tags: $tags) {
          node {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        id: resourceId,
        tags,
      },
    }
  );

  const data = await response.json();
  const result = data.data?.tagsRemove;

  if (result?.userErrors?.length > 0) {
    return {
      success: false,
      errors: result.userErrors.map((e: any) => e.message),
    };
  }

  return { success: true };
}
