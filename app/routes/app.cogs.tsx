import { useState, useEffect, useCallback } from "react";
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useFetcher } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    IndexTable,
    TextField,
    Text,
    Badge,
    useIndexResourceState,
    Button,
    BlockStack,
    InlineStack,
    Banner,
    Pagination,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useSearchParams } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const cursor = url.searchParams.get("page_info");
    const direction = url.searchParams.get("direction") || "next";

    // Determine pagination arguments based on direction
    // Shopify cursor-based pagination usually works with `after` for next and `before` for previous
    // However, the standard pattern often just uses `after` with the cursor provided by `page_info` if we rely on Shopify's simplified navigation,
    // but for full control:
    // If direction is 'previous', we should use `last: 20, before: cursor`
    // If direction is 'next', we should use `first: 20, after: cursor`
    // But standard Polaris pagination often just gives a cursor.
    // Let's stick to a simple `after` cursor for forward navigation for MVP, or handle both if needed.
    // Actually, Shopify's `page_info` parameter in REST is different from GraphQL cursors.
    // For GraphQL, we usually manage `endCursor` and `startCursor`.

    const paginationArgs = direction === "previous"
        ? `last: 20, before: "${cursor}"`
        : `first: 20, after: ${cursor ? `"${cursor}"` : "null"}`;

    const response = await admin.graphql(
        `#graphql
      query GetProducts {
        products(${paginationArgs}) {
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
    `
    );

    const data = await response.json();

    const products = data.data.products.nodes.map((p: any) => {
        return {
            id: p.id,
            title: p.title,
            image: p.featuredImage?.url,
            options: p.options,
            variants: p.variants.nodes.map((v: any) => ({
                id: v.id,
                title: v.title,
                price: parseFloat(v.price),
                cost: v.inventoryItem.unitCost?.amount ? parseFloat(v.inventoryItem.unitCost.amount) : 0,
                inventoryItemId: v.inventoryItem.id,
                selectedOptions: v.selectedOptions,
            })),
        };
    });

    return json({
        products,
        pageInfo: data.data.products.pageInfo
    });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");

    if (actionType === "bulkUpdate") {
        const updates = JSON.parse(formData.get("updates") as string);

        // Batch updates to avoid rate limits, though for MVP we'll just loop
        // In a real scenario, you might want to use a queue or Promise.all with concurrency limit
        const mutation = `#graphql
            mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
                inventoryItemUpdate(id: $id, input: $input) {
                    userErrors {
                        message
                    }
                }
            }
        `;

        const errors: any[] = [];

        // Execute sequentially to be safe with rate limits for now
        for (const update of updates) {
            try {
                const response = await admin.graphql(mutation, {
                    variables: {
                        id: update.inventoryItemId,
                        input: {
                            cost: update.cost,
                        },
                    },
                });

                const data = await response.json();
                if (data.data?.inventoryItemUpdate?.userErrors?.length > 0) {
                    errors.push(...data.data.inventoryItemUpdate.userErrors);
                }
            } catch (e) {
                console.error("Failed to update inventory item", update.inventoryItemId, e);
                errors.push({ message: `Failed to update ${update.inventoryItemId}` });
            }
        }

        if (errors.length > 0) {
            return json({ status: "error", errors }, { status: 422 });
        }

        return json({ status: "success" });
    }

    return json({ status: "ignored" });
};

import { ProductRow, type ProductData } from "../components/Cogs/ProductRow";
import { BulkApplyModal } from "../components/Cogs/BulkApplyModal";

export default function COGS() {
    const { products: initialProducts, pageInfo } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();
    const submit = useSubmit();
    const nav = useNavigation();
    const isSaving = nav.state === "submitting";

    // Local state for optimistic updates
    const [products, setProducts] = useState<ProductData[]>(initialProducts);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Sync with loader data if it changes (e.g. after save or pagination)
    useEffect(() => {
        setProducts(initialProducts);
        setHasChanges(false);
    }, [initialProducts]);

    const resourceName = {
        singular: 'product',
        plural: 'products',
    };

    const handleUpdateCost = useCallback((inventoryItemId: string, newCost: number) => {
        setProducts(prevProducts => {
            return prevProducts.map(product => {
                const variantIndex = product.variants.findIndex(v => v.inventoryItemId === inventoryItemId);
                if (variantIndex !== -1) {
                    const newVariants = [...product.variants];
                    newVariants[variantIndex] = { ...newVariants[variantIndex], cost: newCost };
                    return { ...product, variants: newVariants };
                }
                return product;
            });
        });
        setHasChanges(true);
    }, []);

    const handleSmartApply = (optionName: string, optionValue: string, cost: number) => {
        setProducts(prevProducts => {
            return prevProducts.map(product => {
                const newVariants = product.variants.map(variant => {
                    const matchesOption = variant.selectedOptions.some(
                        opt => opt.name === optionName && opt.value === optionValue
                    );
                    if (matchesOption) {
                        return { ...variant, cost };
                    }
                    return variant;
                });
                return { ...product, variants: newVariants };
            });
        });
        setHasChanges(true);
    };

    const handleSave = () => {
        // Collect all changes
        const updates: { inventoryItemId: string; cost: string }[] = [];
        products.forEach(p => {
            p.variants.forEach(v => {
                // Find original to compare? Or just send all?
                // For MVP, let's send all modified ones or just all to be safe/simple
                // Optimization: Compare with initialProducts to only send changed ones
                const originalProduct = initialProducts.find((ip: any) => ip.id === p.id);
                const originalVariant = originalProduct?.variants.find((iv: any) => iv.id === v.id);

                if (originalVariant && originalVariant.cost !== v.cost) {
                    updates.push({
                        inventoryItemId: v.inventoryItemId,
                        cost: v.cost.toString()
                    });
                }
            });
        });

        if (updates.length === 0) {
            // Nothing to save
            return;
        }

        submit(
            {
                actionType: "bulkUpdate",
                updates: JSON.stringify(updates),
            },
            { method: "post" }
        );
    };

    const handleNextPage = () => {
        if (pageInfo.hasNextPage) {
            setSearchParams((prev: URLSearchParams) => {
                prev.set("page_info", pageInfo.endCursor);
                prev.set("direction", "next");
                return prev;
            });
        }
    };

    const handlePreviousPage = () => {
        if (pageInfo.hasPreviousPage) {
            setSearchParams((prev: URLSearchParams) => {
                prev.set("page_info", pageInfo.startCursor);
                prev.set("direction", "previous");
                return prev;
            });
        }
    };

    const rowMarkup = products.map(
        (product, index) => (
            <ProductRow
                key={product.id}
                product={product}
                index={index}
                onUpdateCost={handleUpdateCost}
            />
        )
    );

    return (
        <Page
            title="COGS & Profit Tracking"
            primaryAction={{
                content: "Save Changes",
                onAction: handleSave,
                loading: isSaving,
                disabled: !hasChanges
            }}
            secondaryActions={[
                {
                    content: "Smart Bulk Apply",
                    onAction: () => setIsModalOpen(true),
                }
            ]}
        >
            <Layout>
                <Layout.Section>
                    <Card padding="0">
                        <IndexTable
                            resourceName={resourceName}
                            itemCount={products.length}
                            headings={[
                                { title: 'Product' },
                                { title: 'Price Range' },
                                { title: 'Cost Input' },
                                { title: 'Avg Margin' },
                                { title: 'Profit' },
                            ]}
                            selectable={false}
                            pagination={{
                                hasNext: pageInfo.hasNextPage,
                                hasPrevious: pageInfo.hasPreviousPage,
                                onNext: handleNextPage,
                                onPrevious: handlePreviousPage,
                            }}
                        >
                            {rowMarkup}
                        </IndexTable>
                    </Card>

                </Layout.Section>
            </Layout>
            <BulkApplyModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                products={products}
                onApply={handleSmartApply}
            />
        </Page>
    );
}
