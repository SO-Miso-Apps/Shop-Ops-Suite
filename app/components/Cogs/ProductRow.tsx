import { useState, useCallback, useEffect } from "react";
import {
    IndexTable,
    TextField,
    Text,
    Badge,
    Button,
    BlockStack,
    InlineStack,
    Box,
    Collapsible,
    Icon,
    Tooltip,
} from "@shopify/polaris";
import { ChevronDownIcon, ChevronUpIcon, AlertCircleIcon } from "@shopify/polaris-icons";
import { resizeShopifyImageCdn } from "~/utils/resize-shopify-image-cdn";

export interface VariantData {
    id: string;
    title: string;
    price: number;
    cost: number;
    inventoryItemId: string;
    selectedOptions: { name: string; value: string }[];
}

export interface ProductData {
    id: string;
    title: string;
    image?: string;
    options: { id: string; name: string; values: string[] }[];
    variants: VariantData[];
}

interface ProductRowProps {
    product: ProductData;
    index: number;
    onUpdateCost: (inventoryItemId: string, newCost: number) => void;
    currencyCode: string;
}

export function ProductRow({ product, index, onUpdateCost, currencyCode }: ProductRowProps) {
    // Get currency symbol from currency code
    const getCurrencySymbol = (code: string) => {
        const symbols: { [key: string]: string } = {
            USD: "$",
            EUR: "€",
            GBP: "£",
            CAD: "$",
            AUD: "$",
            JPY: "¥",
            CNY: "¥",
            INR: "₹",
        };
        return symbols[code] || code;
    };
    const currencySymbol = getCurrencySymbol(currencyCode);
    const [expanded, setExpanded] = useState(false);

    // Determine if all variants have the same cost
    const allCostsEqual = product.variants.every(v => v.cost === product.variants[0].cost);
    const initialParentCost = allCostsEqual && product.variants.length > 0 ? product.variants[0].cost.toString() : "";

    const [parentCost, setParentCost] = useState<string>(initialParentCost);

    // Sync parent cost when variants change externally (e.g. bulk apply)
    useEffect(() => {
        const allEqual = product.variants.every(v => v.cost === product.variants[0].cost);
        if (allEqual && product.variants.length > 0) {
            setParentCost(product.variants[0].cost.toString());
        } else {
            setParentCost("");
        }
    }, [product.variants]);

    // Calculate average margin for the parent row
    const avgMargin = product.variants.reduce((acc, v) => {
        const margin = v.price > 0 ? ((v.price - v.cost) / v.price) * 100 : 0;
        return acc + margin;
    }, 0) / product.variants.length;

    const isLowMargin = avgMargin < 20;
    const isHighMargin = avgMargin > 50;

    const handleParentCostChange = useCallback((value: string) => {
        setParentCost(value);
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
            // Update all variants
            product.variants.forEach(v => {
                onUpdateCost(v.inventoryItemId, numericValue);
            });
        }
    }, [product.variants, onUpdateCost]);

    const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);

    const rowMarkup = (
        <IndexTable.Row
            id={product.id}
            key={product.id}
            position={index}
            onClick={toggleExpanded}
        >
            <IndexTable.Cell>
                <InlineStack gap="300" blockAlign="center">
                    <div onClick={(e) => { e.stopPropagation(); toggleExpanded(); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Icon source={expanded ? ChevronUpIcon : ChevronDownIcon} tone="base" />
                    </div>
                    {product.image && (
                        <img
                            src={resizeShopifyImageCdn(product.image, 128, 128)}
                            alt={product.title}
                            style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                    )}
                    <BlockStack gap="050">
                        <Text variant="bodyMd" fontWeight="bold" as="span">
                            {product.title}
                        </Text>
                        <Text variant="bodySm" tone="subdued" as="span">
                            {product.variants.length} variants
                        </Text>
                    </BlockStack>
                </InlineStack>
            </IndexTable.Cell>
            <IndexTable.Cell>
                {/* Price range if variants differ, else single price */}
                {product.variants.length > 1
                    ? `${Math.min(...product.variants.map(v => v.price))} - ${Math.max(...product.variants.map(v => v.price))}`
                    : product.variants[0]?.price.toFixed(2)}
            </IndexTable.Cell>
            <IndexTable.Cell>
                <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '120px' }}>
                    <TextField
                        label="Parent Cost"
                        labelHidden
                        type="number"
                        value={parentCost}
                        onChange={handleParentCostChange}
                        placeholder="Set all..."
                        autoComplete="off"
                        prefix={currencySymbol}
                        size="slim"
                    />
                </div>
            </IndexTable.Cell>
            <IndexTable.Cell>
                <Badge tone={isLowMargin ? "critical" : isHighMargin ? "success" : undefined}>
                    {avgMargin.toFixed(1) + "%"}
                </Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>
                {/* Profit placeholder */}
                -
            </IndexTable.Cell>
        </IndexTable.Row>
    );

    const variantRows = product.variants.map((variant) => {
        const margin = variant.price > 0 ? ((variant.price - variant.cost) / variant.price) * 100 : 0;
        const profit = variant.price - variant.cost;
        const isVariantLowMargin = margin < 20;

        // Anomaly detection
        const isAnomaly = variant.price > 0 && (variant.cost > variant.price || variant.price > 5 * variant.cost);

        return (
            <div key={variant.id} style={{ padding: '8px 16px', borderBottom: '1px solid #f1f2f4', backgroundColor: '#fafbfb' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '7fr 1fr 2fr 1fr 1fr', gap: '16px', alignItems: 'center' }}>
                    <div style={{ paddingLeft: '36px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Text variant="bodySm" as="span">{variant.title}</Text>
                    </div>
                    <div>
                        <Text variant="bodySm" as="span">${variant.price.toFixed(2)}</Text>
                    </div>
                    <div style={{ maxWidth: '120px' }}>
                        <TextField
                            label="Cost"
                            labelHidden
                            type="number"
                            value={variant.cost.toString()}
                            onChange={(val) => onUpdateCost(variant.inventoryItemId, parseFloat(val))}
                            autoComplete="off"
                            prefix={currencySymbol}
                            size="slim"
                        />
                        {isAnomaly && (
                            <div style={{ marginTop: '4px' }}>
                                <Tooltip content="Price/Cost ratio warning: Cost is higher than price or price is > 5x cost">
                                    <InlineStack gap="100" blockAlign="center">
                                        <span><Icon source={AlertCircleIcon} tone="critical" /></span>
                                        <Text variant="bodyXs" tone="critical" as="span">Check Ratio</Text>
                                    </InlineStack>
                                </Tooltip>
                            </div>
                        )}
                    </div>
                    <div>
                        <Text variant="bodySm" tone={isVariantLowMargin ? "critical" : undefined} as="span">
                            {margin.toFixed(1)}%
                        </Text>
                    </div>
                    <div>
                        <Text variant="bodySm" as="span">${profit.toFixed(2)}</Text>
                    </div>
                </div>
            </div>
        );
    });

    return (
        <>
            {rowMarkup}
            {expanded && (
                <IndexTable.Row id={`${product.id}-variants`} position={index} selected={false}>
                    <IndexTable.Cell colSpan={5}>
                        <Collapsible
                            open={expanded}
                            id={`${product.id}-collapsible`}
                            transition={{ duration: '150ms', timingFunction: 'ease-in-out' }}
                        >
                            <Box paddingBlockEnd="200">
                                {variantRows}
                            </Box>
                        </Collapsible>
                    </IndexTable.Cell>
                </IndexTable.Row>
            )}
        </>
    );
}
