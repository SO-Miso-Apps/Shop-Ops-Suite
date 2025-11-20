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
    Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useSearchParams } from "@remix-run/react";
import { CogsService } from "~/services/cogs.service";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { admin, session } = await authenticate.admin(request);
    const { UsageService } = await import("~/services/usage.service");
    const plan = await UsageService.getPlanType(session.shop);
    const isFreePlan = plan === "Free";

    const url = new URL(request.url);
    const cursor = url.searchParams.get("page_info");
    const direction = url.searchParams.get("direction") || "next";

    let paginationArgs;
    if (isFreePlan) {
        // Free plan: Always fetch first 50, ignore cursor
        paginationArgs = { first: 50 };
    } else {
        paginationArgs = direction === "previous"
            ? { last: 20, before: cursor }
            : { first: 20, after: cursor };
    }

    const { products, pageInfo } = await CogsService.getProductsWithCosts(admin, paginationArgs);

    // Fetch shop currency
    const { ShopConfig } = await import("~/models/ShopConfig");
    const shopConfig = await ShopConfig.findOne({ shop: session.shop });
    const currencyCode = shopConfig?.currencyCode || "USD";

    return json({
        products,
        pageInfo: isFreePlan ? { hasNextPage: false, hasPreviousPage: false } : pageInfo,
        currencyCode,
        isFreePlan
    });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");

    if (actionType === "bulkUpdate") {
        const updates = JSON.parse(formData.get("updates") as string);
        const errors = await CogsService.updateProductCosts(admin, updates);

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
    const { products: initialProducts, pageInfo, currencyCode, isFreePlan } = useLoaderData<typeof loader>();
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
                currencyCode={currencyCode}
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
                {isFreePlan && (
                    <Layout.Section>

                        <Box paddingBlockStart="400">
                            <Banner tone="info">
                                <Text as="p">
                                    You are on the Free plan, which is limited to tracking 50 products.
                                    <Button variant="plain" url="/app/billing">Upgrade to Pro</Button> for unlimited tracking.
                                </Text>
                            </Banner>
                        </Box>
                    </Layout.Section>
                )}
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
