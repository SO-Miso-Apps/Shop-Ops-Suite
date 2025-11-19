import type { AdminApiContext } from '@shopify/shopify-app-remix/server';

export interface MetafieldInput {
  namespace: string;
  key: string;
  value: string;
  valueType: 'string' | 'integer' | 'json';
}

/**
 * Set a metafield on a Shopify resource.
 *
 * @param admin - Shopify Admin API context
 * @param resourceId - Shopify GID
 * @param metafield - Metafield data (namespace, key, value, type)
 * @returns Success status and any errors
 */
export async function setMetafield(
  admin: AdminApiContext,
  resourceId: string,
  metafield: MetafieldInput
): Promise<{ success: boolean; errors?: string[] }> {
  const response = await admin.graphql(
    `#graphql
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
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
        metafields: [
          {
            ownerId: resourceId,
            namespace: metafield.namespace,
            key: metafield.key,
            value: metafield.value,
            type: metafield.valueType,
          },
        ],
      },
    }
  );

  const data = await response.json();
  const result = data.data?.metafieldsSet;

  if (result?.userErrors?.length > 0) {
    return {
      success: false,
      errors: result.userErrors.map((e: any) => e.message),
    };
  }

  return { success: true };
}

/**
 * Remove a metafield from a Shopify resource.
 *
 * Note: Requires metafield ID, not just namespace/key.
 * You may need to query the metafield first to get its ID.
 *
 * @param admin - Shopify Admin API context
 * @param metafieldId - Metafield GID
 * @returns Success status and any errors
 */
export async function removeMetafield(
  admin: AdminApiContext,
  metafieldId: string
): Promise<{ success: boolean; errors?: string[] }> {
  const response = await admin.graphql(
    `#graphql
      mutation metafieldDelete($input: MetafieldDeleteInput!) {
        metafieldDelete(input: $input) {
          deletedId
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        input: { id: metafieldId },
      },
    }
  );

  const data = await response.json();
  const result = data.data?.metafieldDelete;

  if (result?.userErrors?.length > 0) {
    return {
      success: false,
      errors: result.userErrors.map((e: any) => e.message),
    };
  }

  return { success: true };
}

/**
 * Query metafield ID by namespace and key (helper for removeMetafield).
 *
 * @param admin - Shopify Admin API context
 * @param resourceId - Shopify GID
 * @param namespace - Metafield namespace
 * @param key - Metafield key
 * @returns Metafield ID or null if not found
 */
export async function getMetafieldId(
  admin: AdminApiContext,
  resourceId: string,
  namespace: string,
  key: string
): Promise<string | null> {
  const response = await admin.graphql(
    `#graphql
      query getMetafield($id: ID!, $namespace: String!, $key: String!) {
        node(id: $id) {
          ... on HasMetafields {
            metafield(namespace: $namespace, key: $key) {
              id
            }
          }
        }
      }
    `,
    {
      variables: {
        id: resourceId,
        namespace,
        key,
      },
    }
  );

  const data = await response.json();
  return data.data?.node?.metafield?.id || null;
}
