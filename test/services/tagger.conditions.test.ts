import { describe, it, expect } from "vitest";
import { TaggerService } from "~/services/tagger.service";

describe("TaggerService.checkConditions", () => {
    it("should return true when conditions are empty", () => {
        expect(TaggerService.checkConditions({}, [])).toBe(true);
    });

    describe("Operator: equals", () => {
        it("should match exact strings (case-insensitive)", () => {
            const conditions = [{ field: "vendor", operator: "equals", value: "Nike" }];
            expect(TaggerService.checkConditions({ vendor: "Nike" }, conditions)).toBe(true);
            expect(TaggerService.checkConditions({ vendor: "nike" }, conditions)).toBe(true);
            expect(TaggerService.checkConditions({ vendor: "Adidas" }, conditions)).toBe(false);
        });

        it("should match numbers as strings", () => {
            const conditions = [{ field: "id", operator: "equals", value: "123" }];
            expect(TaggerService.checkConditions({ id: 123 }, conditions)).toBe(true);
            expect(TaggerService.checkConditions({ id: 456 }, conditions)).toBe(false);
        });
    });

    describe("Operator: not_equals", () => {
        it("should return true when values do not match", () => {
            const conditions = [{ field: "vendor", operator: "not_equals", value: "Nike" }];
            expect(TaggerService.checkConditions({ vendor: "Adidas" }, conditions)).toBe(true);
            expect(TaggerService.checkConditions({ vendor: "Nike" }, conditions)).toBe(false);
        });
    });

    describe("Operator: contains", () => {
        it("should return true when substring exists", () => {
            const conditions = [{ field: "title", operator: "contains", value: "Shirt" }];
            expect(TaggerService.checkConditions({ title: "Blue T-Shirt" }, conditions)).toBe(true);
            expect(TaggerService.checkConditions({ title: "Pants" }, conditions)).toBe(false);
        });
    });

    describe("Operator: starts_with", () => {
        it("should return true when string starts with value", () => {
            const conditions = [{ field: "sku", operator: "starts_with", value: "ABC" }];
            expect(TaggerService.checkConditions({ sku: "ABC-123" }, conditions)).toBe(true);
            expect(TaggerService.checkConditions({ sku: "DEF-ABC" }, conditions)).toBe(false);
        });
    });

    describe("Operator: greater_than", () => {
        it("should compare numbers correctly", () => {
            const conditions = [{ field: "price", operator: "greater_than", value: "100" }];
            expect(TaggerService.checkConditions({ price: "150" }, conditions)).toBe(true);
            expect(TaggerService.checkConditions({ price: 150 }, conditions)).toBe(true);
            expect(TaggerService.checkConditions({ price: "50" }, conditions)).toBe(false);
        });

        it("should return false for non-numeric values", () => {
            const conditions = [{ field: "price", operator: "greater_than", value: "100" }];
            expect(TaggerService.checkConditions({ price: "expensive" }, conditions)).toBe(false);
        });
    });

    describe("Operator: less_than", () => {
        it("should compare numbers correctly", () => {
            const conditions = [{ field: "inventory", operator: "less_than", value: "10" }];
            expect(TaggerService.checkConditions({ inventory: 5 }, conditions)).toBe(true);
            expect(TaggerService.checkConditions({ inventory: 15 }, conditions)).toBe(false);
        });
    });

    describe("Nested Fields", () => {
        it("should resolve nested properties", () => {
            const conditions = [{ field: "address.city", operator: "equals", value: "New York" }];
            expect(TaggerService.checkConditions({ address: { city: "New York" } }, conditions)).toBe(true);
            expect(TaggerService.checkConditions({ address: { city: "Boston" } }, conditions)).toBe(false);
        });

        it("should return false (empty string match) if path does not exist", () => {
            const conditions = [{ field: "address.zip", operator: "equals", value: "90210" }];
            expect(TaggerService.checkConditions({ address: {} }, conditions)).toBe(false);
        });
    });

    describe("Multiple Conditions (AND Logic)", () => {
        it("should return true only if ALL conditions match", () => {
            const conditions = [
                { field: "vendor", operator: "equals", value: "Nike" },
                { field: "price", operator: "greater_than", value: "100" }
            ];
            expect(TaggerService.checkConditions({ vendor: "Nike", price: 150 }, conditions)).toBe(true);
            expect(TaggerService.checkConditions({ vendor: "Nike", price: 50 }, conditions)).toBe(false);
            expect(TaggerService.checkConditions({ vendor: "Adidas", price: 150 }, conditions)).toBe(false);
        });
    });
});
