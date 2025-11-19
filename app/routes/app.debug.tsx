import { useState } from "react";
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { useSubmit, useActionData, useNavigation } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    FormLayout,
    TextField,
    Button,
    BlockStack,
    Banner,
    Text,
    Box,
    List
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { evaluateMetafieldRules } from "~/services/tagger.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { admin, session } = await authenticate.admin(request);
    const formData = await request.formData();
    const productId = formData.get("productId") as string;

    // Lấy ID số từ GID nếu cần
    const cleanId = productId.replace("gid://shopify/Product/", "");

    try {
        // 1. Fetch dữ liệu sản phẩm thật từ Shopify
        const response = await admin.graphql(
            `#graphql
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          vendor
          productType
          tags
          variants(first: 1) {
            nodes {
              price
              sku
              inventoryQuantity
            }
          }
        }
      }`,
            { variables: { id: `gid://shopify/Product/${cleanId}` } }
        );

        const productData = await response.json();
        const product = productData.data?.product;

        if (!product) {
            return json({ status: "error", logs: ["Không tìm thấy sản phẩm với ID này trên Shopify."] });
        }

        // 2. Chuẩn hóa payload giống hệt Webhook
        const normalizedPayload = {
            id: cleanId,
            title: product.title,
            vendor: product.vendor,
            product_type: product.productType,
            tags: product.tags,
            price: product.variants.nodes[0]?.price,
            sku: product.variants.nodes[0]?.sku,
            inventory: product.variants.nodes[0]?.inventoryQuantity,
            // Giả lập object gốc để đảm bảo tương thích ngược
            variants: [{
                price: product.variants.nodes[0]?.price,
                sku: product.variants.nodes[0]?.sku,
                inventory_quantity: product.variants.nodes[0]?.inventoryQuantity
            }]
        };

        // 3. Chạy thử logic và bắt log
        const logs: string[] = [];
        const originalLog = console.log;

        // Hook console.log để hiển thị ra UI
        console.log = (...args) => {
            logs.push(args.map(a => JSON.stringify(a)).join(" "));
            originalLog(...args);
        };

        logs.push(`▶ Bắt đầu kiểm tra cho sản phẩm: ${product.title}`);
        logs.push(`▶ Dữ liệu chuẩn hóa: ${JSON.stringify(normalizedPayload, null, 2)}`);

        await evaluateMetafieldRules(admin, session.shop, normalizedPayload, "products");

        console.log = originalLog; // Restore console

        return json({ status: "success", logs, product: normalizedPayload });

    } catch (error) {
        return json({ status: "error", logs: [`Lỗi hệ thống: ${(error as Error).message}`] });
    }
};

export default function DebugTool() {
    const actionData = useActionData<typeof action>();
    const submit = useSubmit();
    const nav = useNavigation();
    const isLoading = nav.state === "submitting";

    const [productId, setProductId] = useState("");

    const handleTest = () => {
        submit({ productId }, { method: "post" });
    };

    return (
        <Page title="Debug Tool: Rule Simulator">
            <Layout>
                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Text as="h2" variant="headingMd">Giả lập Webhook Product Create</Text>
                            <Text as="p">Công cụ này giúp bạn kiểm tra xem Rule có khớp với sản phẩm không mà không cần tạo sản phẩm thật.</Text>

                            <FormLayout>
                                <TextField
                                    label="Product ID (VD: 987654321)"
                                    value={productId}
                                    onChange={setProductId}
                                    autoComplete="off"
                                    placeholder="Nhập ID sản phẩm từ URL trang admin"
                                />
                                <Button onClick={handleTest} loading={isLoading} variant="primary">
                                    Chạy Kiểm Tra (Test Run)
                                </Button>
                            </FormLayout>

                            {actionData?.status === "error" && (
                                <Banner tone="critical">{actionData.logs[0]}</Banner>
                            )}

                            {actionData?.status === "success" && (
                                <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                                    <BlockStack gap="200">
                                        <Text as="h3" variant="headingSm">Execution Logs:</Text>
                                        <List type="bullet">
                                            {actionData.logs.map((log: string, i: number) => (
                                                <List.Item key={i}>
                                                    <span style={{ fontFamily: 'monospace' }}>{log}</span>
                                                </List.Item>
                                            ))}
                                        </List>
                                    </BlockStack>
                                </Box>
                            )}
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}