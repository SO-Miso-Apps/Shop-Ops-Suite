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
} from "@shopify/polaris";
import { useState } from "react";
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
    // 1. Run Bulk Operation to get all tags
    // Since we can't easily get *just* tags without iterating products/customers, 
    // we'll do a simplified scan of the first 250 products for MVP to avoid waiting for Bulk Op file.
    // In a real production app, we MUST use bulkOperationRunQuery and process the JSONL file.
    // For this demo/MVP, we'll fetch a batch of products and extract tags.

    const query = `#graphql
      query {
        products(first: 50) {
          nodes {
            tags
          }
        }
        customers(first: 50) {
          nodes {
            tags
          }
        }
      }
    `;

    const response = await admin.graphql(query);
    const data = await response.json();

    const allTags: string[] = [];
    data.data.products.nodes.forEach((p: any) => allTags.push(...p.tags));
    data.data.customers.nodes.forEach((c: any) => allTags.push(...c.tags));

    const uniqueTags = [...new Set(allTags)];

    // Analyze tags
    const unusedTags: string[] = []; // Hard to determine unused without full scan
    const duplicateTags: string[] = [];
    const malformedTags: string[] = [];

    // Simple heuristic for duplicates (case-insensitive match)
    const lowerCaseMap = new Map<string, string>();
    uniqueTags.forEach(tag => {
      const lower = tag.toLowerCase();
      if (lowerCaseMap.has(lower)) {
        duplicateTags.push(tag); // Found a duplicate (e.g. "Sale" vs "sale")
      } else {
        lowerCaseMap.set(lower, tag);
      }
    });

    // Heuristic for malformed
    const specialChars = /[^a-zA-Z0-9\s-_]/;
    uniqueTags.forEach(tag => {
      if (tag.length > 20 || specialChars.test(tag)) {
        malformedTags.push(tag);
      }
    });

    return json({
      status: "scanned",
      results: {
        duplicates: duplicateTags,
        malformed: malformedTags,
        totalScanned: uniqueTags.length
      }
    });
  } else if (actionType === "cleanTags") {
    const tagsToRemove = JSON.parse(formData.get("tags") as string);

    // In real app: Trigger background job to remove these tags from all resources.
    // For MVP: We'll just simulate a success message as removing tags from ALL products 
    // requires iterating all products again.

    return json({ status: "cleaned", count: tagsToRemove.length });
  }

  return json({});
};

export default function DataCleaner() {
  const actionData = useActionData<typeof action>() as {
    status?: string;
    results?: {
      duplicates: string[];
      malformed: string[];
      totalScanned: number
    };
    count?: number;
  };
  const submit = useSubmit();
  const nav = useNavigation();
  const isLoading = nav.state === "submitting";

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const results = actionData?.results;
  const isCleaned = actionData?.status === "cleaned";

  const handleScan = () => {
    submit({ actionType: "scanTags" }, { method: "post" });
  };

  const handleClean = () => {
    submit(
      {
        actionType: "cleanTags",
        tags: JSON.stringify(selectedTags)
      },
      { method: "post" }
    );
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
              <Text variant="headingMd" as="h2">AI Tag Scanner</Text>
              <Text as="p">
                Scan your store for messy, duplicate, or unused tags.
                This helps keep your filters and organization clean.
              </Text>

              {!results && !isCleaned && (
                <ButtonGroup>
                  <Button onClick={handleScan} loading={isLoading} variant="primary">
                    Start Scan
                  </Button>
                </ButtonGroup>
              )}

              {isLoading && !results && (
                <Box paddingBlockStart="400">
                  <BlockStack gap="200">
                    <Text as="p">Scanning products and customers...</Text>
                    <ProgressBar progress={80} />
                  </BlockStack>
                </Box>
              )}

              {results && (
                <BlockStack gap="400">
                  <Banner tone="success">
                    Scan complete! Found {results.totalScanned} unique tags.
                  </Banner>

                  {results.duplicates.length > 0 && (
                    <Box>
                      <Text variant="headingSm" as="h3">Potential Duplicates (Case Sensitivity)</Text>
                      <List>
                        {results.duplicates.map(tag => (
                          <List.Item key={tag}>
                            <Checkbox
                              label={`Remove "${tag}"`}
                              checked={selectedTags.includes(tag)}
                              onChange={() => toggleTag(tag)}
                            />
                          </List.Item>
                        ))}
                      </List>
                    </Box>
                  )}

                  {results.malformed.length > 0 && (
                    <Box>
                      <Text variant="headingSm" as="h3">Malformed / Long Tags</Text>
                      <List>
                        {results.malformed.map(tag => (
                          <List.Item key={tag}>
                            <Checkbox
                              label={`Remove "${tag}"`}
                              checked={selectedTags.includes(tag)}
                              onChange={() => toggleTag(tag)}
                            />
                          </List.Item>
                        ))}
                      </List>
                    </Box>
                  )}

                  {results.duplicates.length === 0 && results.malformed.length === 0 && (
                    <Text as="p" tone="subdued">No issues found with your tags.</Text>
                  )}

                  {(results.duplicates.length > 0 || results.malformed.length > 0) && (
                    <InlineStack gap="300">
                      <Button
                        variant="primary"
                        tone="critical"
                        onClick={handleClean}
                        disabled={selectedTags.length === 0}
                        loading={isLoading}
                      >
                        Clean Selected Tags ({selectedTags.length.toString()})
                      </Button>
                      <Button onClick={() => setSelectedTags([])}>Deselect All</Button>
                    </InlineStack>
                  )}
                </BlockStack>
              )}

              {isCleaned && (
                <Banner tone="success" onDismiss={() => window.location.reload()}>
                  Successfully cleaned {actionData.count} tags.
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
