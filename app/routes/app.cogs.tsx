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
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { admin } = await authenticate.admin(request);

    const response = await admin.graphql(
        `#graphql
      query GetProducts {
        products(first: 20) {
          nodes {
            id
            title
            featuredImage {
              url
            }
            variants(first: 1) {
              nodes {
                id
                price
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
        const variant = p.variants.nodes[0];
        return {
            id: p.id,
            title: p.title,
            image: p.featuredImage?.url,
            variantId: variant.id,
            inventoryItemId: variant.inventoryItem.id,
            price: parseFloat(variant.price),
            cost: variant.inventoryItem.unitCost?.amount ? parseFloat(variant.inventoryItem.unitCost.amount) : 0,
        };
    });

    return json({ products });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");

    if (actionType === "updateCost") {
        const inventoryItemId = formData.get("inventoryItemId") as string;
        let cost = formData.get("cost") as string;
        if (!cost || cost.trim() === "") {
            cost = "0.00";
        }

        const mutation = `#graphql
      mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
        inventoryItemUpdate(id: $id, input: $input) {
          inventoryItem {
            id
            unitCost {
              amount
            }
          }
          userErrors {
            message
          }
        }
      }
    `;

        await admin.graphql(mutation, {
            variables: {
                id: inventoryItemId,
                input: {
                    cost: cost,
                },
            },
        });
    } else if (actionType === "applyMarginRule") {
        // Bulk update for all visible products (simplified)
        // In a real app, we would pass the IDs to update or do it via a background job if many.
        // Here we just receive a JSON string of updates
        const updates = JSON.parse(formData.get("updates") as string);

        for (const update of updates) {
            const mutation = `#graphql
        mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
          inventoryItemUpdate(id: $id, input: $input) {
            inventoryItem {
              id
            }
          }
        }
      `;
            await admin.graphql(mutation, {
                variables: {
                    id: update.inventoryItemId,
                    input: { cost: update.cost.toString() },
                },
            });
        }
    }

    return json({ status: "success" });
};

function CostInput({ inventoryItemId, initialCost }: { inventoryItemId: string, initialCost: number }) {
    const fetcher = useFetcher();
    const [value, setValue] = useState(initialCost.toString());

    // Update local state if initialCost changes (e.g. from external update)
    useEffect(() => {
        setValue(initialCost.toString());
    }, [initialCost]);

    // Debounce submit
    useEffect(() => {
        const timer = setTimeout(() => {
            if (value !== initialCost.toString()) {
                fetcher.submit(
                    {
                        actionType: "updateCost",
                        inventoryItemId,
                        cost: value,
                    },
                    { method: "post" }
                );
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [value, inventoryItemId, initialCost, fetcher]);

    return (
        <div style={{ maxWidth: '100px' }}>
            <TextField
                label="Cost"
                labelHidden
                type="number"
                value={value}
                onChange={(newValue) => setValue(newValue)}
                autoComplete="off"
                prefix="$"
            />
        </div>
    );
}

export default function COGS() {
    const { products } = useLoaderData<typeof loader>();
    const submit = useSubmit();
    const nav = useNavigation();
    const isSaving = nav.state === "submitting";

    const resourceName = {
        singular: 'product',
        plural: 'products',
    };

    const { selectedResources, allResourcesSelected, handleSelectionChange } =
        useIndexResourceState(products);

    const applyMarginRule = () => {
        // Apply 40% margin rule: Cost = Price * 0.6
        const updates = products.map((p: any) => ({
            inventoryItemId: p.inventoryItemId,
            cost: (p.price * 0.6).toFixed(2),
        }));

        submit(
            {
                actionType: "applyMarginRule",
                updates: JSON.stringify(updates),
            },
            { method: "post" }
        );
    };

    const rowMarkup = products.map(
        ({ id, title, image, price, cost, inventoryItemId }: any, index: number) => {
            const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
            const profit = price - cost;
            const isLowMargin = margin < 10;

            return (
                <IndexTable.Row
                    id={id}
                    key={id}
                    selected={selectedResources.includes(id)}
                    position={index}
                >
                    <IndexTable.Cell>
                        <InlineStack gap="300" blockAlign="center">
                            {image && (
                                <img
                                    src={image}
                                    alt={title}
                                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                                />
                            )}
                            <Text variant="bodyMd" fontWeight="bold" as="span">
                                {title}
                            </Text>
                        </InlineStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>${price.toFixed(2)}</IndexTable.Cell>
                    <IndexTable.Cell>
                        <CostInput inventoryItemId={inventoryItemId} initialCost={cost} />
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Text as="span" tone={isLowMargin ? "critical" : undefined}>
                            {margin.toFixed(1)}%
                        </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>${profit.toFixed(2)}</IndexTable.Cell>
                </IndexTable.Row>
            );
        },
    );

    return (
        <Page
            title="COGS & Profit Tracking"
            primaryAction={{ content: "Apply 40% Margin Rule", onAction: applyMarginRule, loading: isSaving }}
        >
            <Layout>
                <Layout.Section>
                    <Card padding="0">
                        <IndexTable
                            resourceName={resourceName}
                            itemCount={products.length}
                            selectedItemsCount={
                                allResourcesSelected ? 'All' : selectedResources.length
                            }
                            onSelectionChange={handleSelectionChange}
                            headings={[
                                { title: 'Product' },
                                { title: 'Price' },
                                { title: 'Cost per Item' },
                                { title: 'Margin' },
                                { title: 'Profit' },
                            ]}
                        >
                            {rowMarkup}
                        </IndexTable>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
