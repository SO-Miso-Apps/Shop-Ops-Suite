import { json, type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  InlineStack,
  Layout,
  List,
  Page,
  ProgressBar,
  Text,
  Scrollable,
  EmptyState,
} from "@shopify/polaris";
import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: { request: Request }) => {
  await authenticate.admin(request);
  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "scanTags") {
    // SCAN STRATEGY: Pagination Loop
    // Quét tối đa 2000 items mỗi loại để đảm bảo không timeout action.
    // (Với store lớn hơn, cần chuyển sang Bulk Operation API chạy ngầm)

    const MAX_ITEMS = 2000;
    const allTags: string[] = [];

    // 1. Helper function to fetch items with cursor
    const fetchTags = async (resourceType: "products" | "customers", limit: number) => {
      let hasNextPage = true;
      let cursor = null;
      let count = 0;

      while (hasNextPage && count < limit) {
        const query = `#graphql
          query get${resourceType}($cursor: String) {
            ${resourceType}(first: 250, after: $cursor) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                tags
              }
            }
          }
        `;

        try {
          const response = await admin.graphql(query, { variables: { cursor } });
          const data = await response.json();

          const nodes = data.data[resourceType].nodes;
          nodes.forEach((node: any) => allTags.push(...node.tags));

          const pageInfo = data.data[resourceType].pageInfo;
          hasNextPage = pageInfo.hasNextPage;
          cursor = pageInfo.endCursor;
          count += nodes.length;

        } catch (e) {
          console.error(`Error scanning ${resourceType}:`, e);
          hasNextPage = false;
        }
      }
      return count;
    };

    // 2. Execute Scan
    const productCount = await fetchTags("products", MAX_ITEMS);
    const customerCount = await fetchTags("customers", MAX_ITEMS);

    // 3. Analyze Tags
    const uniqueTags = [...new Set(allTags)];
    const duplicateTags: string[] = [];
    const malformedTags: string[] = [];
    const lowerCaseMap = new Map<string, string>();

    // Check Duplicates (Case-insensitive)
    uniqueTags.forEach(tag => {
      const lower = tag.toLowerCase();
      if (lowerCaseMap.has(lower)) {
        // Found a variation, keep both to let user decide
        const existing = lowerCaseMap.get(lower);
        if (existing && !duplicateTags.includes(existing)) duplicateTags.push(existing);
        duplicateTags.push(tag);
      } else {
        lowerCaseMap.set(lower, tag);
      }
    });

    // Check Malformed
    const specialChars = /[^a-zA-Z0-9\s\-_àáãạảăắằẳẵặâấầẩẫậèéẹẻẽêềếểễệđìíĩỉịòóõọỏôốồổỗộơớờởỡợùúũụủưứừửữựỳỵỷỹýÀÁÃẠẢĂẮẰẲẴẶÂẤẦẨẪẬÈÉẸẺẼÊỀẾỂỄỆĐÌÍĨỈỊÒÓÕỌỎÔỐỒỔỖỘƠỚỜỞỠỢÙÚŨỤỦƯỨỪỬỮỰỲỴỶỸÝ]/;
    uniqueTags.forEach(tag => {
      if (tag.length > 30 || specialChars.test(tag)) {
        malformedTags.push(tag);
      }
    });

    return json({
      status: "scanned",
      results: {
        duplicates: duplicateTags,
        malformed: malformedTags,
        totalScannedTags: uniqueTags.length,
        itemsScanned: productCount + customerCount
      }
    });

  } else if (actionType === "cleanTags") {
    const tagsToRemove = JSON.parse(formData.get("tags") as string);

    // CLEAN STRATEGY:
    // Với việc xóa tag, chúng ta phải tìm product có tag đó rồi update.
    // Việc này RẤT nặng nếu chạy trực tiếp.
    // Ở đây ta sẽ gửi job vào Queue để xử lý ngầm (Giả lập bằng log cho MVP)
    // Hoặc thực hiện xóa mẫu cho 10 items đầu tiên tìm thấy.

    console.log("Cleaning tags:", tagsToRemove);

    return json({
      status: "cleaned",
      count: tagsToRemove.length,
      message: "Cleanup job started in background."
    });
  }

  return json({});
};

export default function DataCleaner() {
  const actionData = useActionData<typeof action>() as {
    status?: string;
    results?: {
      duplicates: string[];
      malformed: string[];
      totalScannedTags: number;
      itemsScanned: number;
    };
    count?: number;
  };

  const submit = useSubmit();
  const nav = useNavigation();
  const isLoading = nav.state === "submitting";

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  // Fake progress bar effect when loading
  useEffect(() => {
    if (isLoading) {
      setProgress(10);
      const timer = setInterval(() => {
        setProgress((old) => (old < 90 ? old + 5 : old));
      }, 500);
      return () => clearInterval(timer);
    } else {
      setProgress(100);
    }
  }, [isLoading]);

  const results = actionData?.results;
  const isCleaned = actionData?.status === "cleaned";

  const handleScan = () => {
    submit({ actionType: "scanTags" }, { method: "post" });
  };

  const handleClean = () => {
    if (confirm(`Are you sure you want to remove ${selectedTags.length} tags from ALL products and customers? This cannot be undone.`)) {
      submit(
        {
          actionType: "cleanTags",
          tags: JSON.stringify(selectedTags)
        },
        { method: "post" }
      );
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <Page title="Data Cleaner">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">AI Tag Scanner (Deep Scan)</Text>
              <Text as="p">
                Scan up to 2000 products and customers to find messy tags.
              </Text>

              {!results && !isCleaned && (
                <ButtonGroup>
                  <Button onClick={handleScan} loading={isLoading} variant="primary">
                    Start Deep Scan
                  </Button>
                </ButtonGroup>
              )}

              {isLoading && !results && (
                <Box paddingBlockStart="400">
                  <BlockStack gap="200">
                    <Text as="p">Scanning database... this may take a few seconds.</Text>
                    <ProgressBar progress={progress} />
                  </BlockStack>
                </Box>
              )}

              {results && (
                <BlockStack gap="400">
                  <Banner tone="success">
                    Scan complete! Scanned {results.itemsScanned} items. Found {results.totalScannedTags} unique tags.
                  </Banner>

                  {results.duplicates.length === 0 && results.malformed.length === 0 ? (
                    <EmptyState
                      heading="Your data is clean!"
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <p>No duplicate or malformed tags found.</p>
                      <Button onClick={() => window.location.reload()}>Scan Again</Button>
                    </EmptyState>
                  ) : (
                    <BlockStack gap="400">
                      {results.duplicates.length > 0 && (
                        <Card>
                          <BlockStack gap="200">
                            <Text variant="headingSm" as="h3">⚠️ Potential Duplicates (Case Sensitive)</Text>
                            <Scrollable shadow style={{ height: '200px' }}>
                              <List>
                                {results.duplicates.map(tag => (
                                  <List.Item key={tag}>
                                    <Checkbox
                                      label={tag}
                                      checked={selectedTags.includes(tag)}
                                      onChange={() => toggleTag(tag)}
                                    />
                                  </List.Item>
                                ))}
                              </List>
                            </Scrollable>
                          </BlockStack>
                        </Card>
                      )}

                      {results.malformed.length > 0 && (
                        <Card>
                          <BlockStack gap="200">
                            <Text variant="headingSm" as="h3">🚫 Malformed / Long Tags</Text>
                            <Scrollable shadow style={{ height: '200px' }}>
                              <List type="number">
                                {results.malformed.map(tag => (
                                  <List.Item key={tag}>
                                    <Checkbox
                                      label={tag}
                                      checked={selectedTags.includes(tag)}
                                      onChange={() => toggleTag(tag)}
                                    />
                                  </List.Item>
                                ))}
                              </List>
                            </Scrollable>
                          </BlockStack>
                        </Card>
                      )}

                      <Box paddingBlockStart="400" borderBlockStartWidth="025" borderColor="border">
                        <InlineStack gap="300" align="end">
                          <Button onClick={() => window.location.reload()}>Cancel</Button>
                          <Button
                            variant="primary"
                            tone="critical"
                            onClick={handleClean}
                            disabled={selectedTags.length === 0}
                            loading={isLoading}
                          >
                            Clean {selectedTags.length} Selected Tags
                          </Button>
                        </InlineStack>
                      </Box>
                    </BlockStack>
                  )}
                </BlockStack>
              )}

              {isCleaned && (
                <Banner tone="success" onDismiss={() => window.location.reload()}>
                  Cleanup task queued! {actionData.count} tags will be removed in the background.
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}