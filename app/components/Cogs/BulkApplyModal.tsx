import { useState, useMemo } from "react";
import { Modal, Select, TextField, BlockStack, Text } from "@shopify/polaris";
import type { ProductData } from "./ProductRow";

interface BulkApplyModalProps {
    open: boolean;
    onClose: () => void;
    products: ProductData[];
    onApply: (optionName: string, optionValue: string, cost: number) => void;
}

export function BulkApplyModal({ open, onClose, products, onApply }: BulkApplyModalProps) {
    const [selectedOptionName, setSelectedOptionName] = useState<string>("");
    const [selectedOptionValue, setSelectedOptionValue] = useState<string>("");
    const [cost, setCost] = useState<string>("");

    // Extract all unique option names across all products
    const optionNames = useMemo(() => {
        const names = new Set<string>();
        products.forEach(p => {
            p.options.forEach(o => names.add(o.name));
        });
        return Array.from(names).map(name => ({ label: name, value: name }));
    }, [products]);

    // Extract values for the selected option name
    const optionValues = useMemo(() => {
        if (!selectedOptionName) return [];
        const values = new Set<string>();
        products.forEach(p => {
            const option = p.options.find(o => o.name === selectedOptionName);
            if (option) {
                option.values.forEach(v => values.add(v));
            }
        });
        return Array.from(values).map(val => ({ label: val, value: val }));
    }, [products, selectedOptionName]);

    const handleApply = () => {
        const numericCost = parseFloat(cost);
        if (selectedOptionName && selectedOptionValue && !isNaN(numericCost)) {
            onApply(selectedOptionName, selectedOptionValue, numericCost);
            onClose();
            // Reset fields
            setCost("");
            setSelectedOptionName("");
            setSelectedOptionValue("");
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Smart Bulk Apply"
            primaryAction={{
                content: "Apply",
                onAction: handleApply,
                disabled: !selectedOptionName || !selectedOptionValue || !cost
            }}
            secondaryActions={[
                {
                    content: "Cancel",
                    onAction: onClose,
                },
            ]}
        >
            <Modal.Section>
                <BlockStack gap="400">
                    <Text as="p">
                        Apply a cost to all variants matching a specific option value across all visible products.
                    </Text>
                    <Select
                        label="Option Name"
                        options={[{ label: "Select an option", value: "" }, ...optionNames]}
                        value={selectedOptionName}
                        onChange={setSelectedOptionName}
                    />
                    <Select
                        label="Option Value"
                        options={[{ label: "Select a value", value: "" }, ...optionValues]}
                        value={selectedOptionValue}
                        onChange={setSelectedOptionValue}
                        disabled={!selectedOptionName}
                    />
                    <TextField
                        label="Cost"
                        type="number"
                        value={cost}
                        onChange={setCost}
                        autoComplete="off"
                        prefix="$"
                    />
                </BlockStack>
            </Modal.Section>
        </Modal>
    );
}
