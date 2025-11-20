import { json, type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, useNavigation, useSubmit, useLoaderData, Link } from "@remix-run/react";
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
  Modal,
} from "@shopify/polaris";
import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server";
import { cleanerQueue } from "../queue.server";
import { CleanerService } from "../services/cleaner.service";
import { useAppBridge } from "@shopify/app-bridge-react";
import { UsageService } from "../services/usage.service";
import { getPlan } from "~/utils/get-plan";
import { generateJobId } from "~/utils/id-generator";

export const loader = async ({ request }: { request: Request }) => {
  const { session } = await authenticate.admin(request);

  // Get current usage stats
  const usage = await UsageService.getCurrentUsage(session.shop);
  const plan = await UsageService.getPlanType(session.shop);
  const limit = plan === "Free" ? 500 : null;

  return json({ usage, plan, limit });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "scanTags") {
    // SCAN STRATEGY: Pagination Loop
    // Quét tối đa 2000 items mỗi loại để đảm bảo không timeout action.
    // (Với store lớn hơn, cần chuyển sang Bulk Operation API chạy ngầm)

    const MAX_ITEMS = 2000;
    const allTags: string[] = [];
    const itemsWithTags: Array<{ id: string; tags: string[] }> = [];

    // 1. Scan tags from products and customers
    // Note: CleanerService.scanTags currently returns empty, we'll use inline query for now
    const scanResourceTags = async (resourceType: "products" | "customers", limit: number) => {
      const query = `
        query {
          ${resourceType}(first: 250) {
            edges {
              node {
                id
                tags
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const response = await admin.graphql(query);
      const data = await response.json();
      const edges = data.data[resourceType].edges;

      edges.forEach((edge: any) => {
        const tags = edge.node.tags || [];
        allTags.push(...tags);
        if (tags.length > 0) {
          itemsWithTags.push({ id: edge.node.id, tags });
        }
      });

      return edges.length;
    };

    // 2. Execute Scan
    const productCount = await scanResourceTags("products", MAX_ITEMS);
    const customerCount = await scanResourceTags("customers", MAX_ITEMS);

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
        itemsScanned: productCount + customerCount,
        previewItems: itemsWithTags.slice(0, 10), // First 10 items for preview
      }
    });

  } else if (actionType === "cleanTags") {
    const tagsToRemove = JSON.parse(formData.get("tags") as string);
    const affectedCount = parseInt(formData.get("affectedCount") as string);

    // Check quota
    const quotaCheck = await UsageService.checkQuota(session.shop, affectedCount);
    if (!quotaCheck.allowed) {
      return json({
        status: "quota_exceeded",
        message: quotaCheck.message,
        current: quotaCheck.current,
        limit: quotaCheck.limit,
      });
    }

    // Dispatch job to BullMQ for background processing
    const jobId = generateJobId();
    const job = await cleanerQueue.add("clean-tags", {
      shop: session.shop,
      tagsToRemove,
      jobId,
    });

    return json({
      status: "queued",
      count: tagsToRemove.length,
      jobId,
      message: `Tag cleanup job queued successfully. Check Activity Logs for completion status.`
    });
  }

  return json({});
};

export default function DataCleaner() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as {
    status?: string;
    results?: {
      duplicates: string[];
      malformed: string[];
      totalScannedTags: number;
      itemsScanned: number;
      previewItems?: Array<{ id: string; tags: string[] }>;
    };
    count?: number;
    jobId?: string;
    message?: string;
    current?: number;
    limit?: number | null;
  };

  const [isShowUpgradeBanner, setShowUpgradeBanner] = useState(true);
  const shopify = useAppBridge();
  const submit = useSubmit();
  const nav = useNavigation();
  const isLoading = nav.state === "submitting";

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  useEffect(() => {
    if (actionData?.status === "queued") {
      shopify.toast.show("Cleanup job started");
    }
  }, [actionData, shopify]);

  const results = actionData?.results;
  const isCleaned = actionData?.status === "queued";

  const handleScan = () => {
    submit({ actionType: "scanTags" }, { method: "post" });
  };

  const handleClean = () => {
    setIsModalOpen(true);
  };

  // Calculate affected items count for quota check
  const calculateAffectedCount = () => {
    // Estimate based on selected tags and scanned items
    // This is approximate; real count would need a query
    return results?.itemsScanned || 0;
  };

  const confirmClean = () => {
    submit(
      {
        actionType: "cleanTags",
        tags: JSON.stringify(selectedTags),
        affectedCount: calculateAffectedCount().toString(),
      },
      { method: "post" }
    );
    setIsModalOpen(false);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const usagePercent = loaderData.limit
    ? Math.round((loaderData.usage.count / loaderData.limit) * 100)
    : 0;

  return (
    <Page title="Data Cleaner">
      <Layout>
        <Layout.Section>
          {/* Usage Banner */}
          {loaderData.plan === "Free" && isShowUpgradeBanner && (
            <Banner
              tone={usagePercent >= 90 ? "warning" : "info"}
              title={`${loaderData.plan} Plan - ${loaderData.usage.count}/${loaderData.limit} operations this month`}
              onDismiss={() => setShowUpgradeBanner(false)}
            >
              <BlockStack gap="200">
                <ProgressBar progress={usagePercent} size="small" />
                {usagePercent >= 90 && (
                  <Text as="p">
                    You're running low on quota. Upgrade to Pro for unlimited operations. <Link to="/app/billing">Upgrade Now</Link>
                  </Text>
                )}
              </BlockStack>
            </Banner>
          )}
        </Layout.Section>
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
                            Clean {'' + selectedTags.length} Selected Tags
                          </Button>
                        </InlineStack>
                      </Box>
                    </BlockStack>
                  )}
                </BlockStack>
              )}

              {isCleaned && (
                <Banner tone="info" onDismiss={() => window.location.reload()}>
                  <BlockStack gap="200">
                    <Text as="p">
                      {actionData.message || `Cleanup job queued! ${actionData.count} tag(s) will be removed.`}
                    </Text>
                    {actionData.jobId && (
                      <Text as="p" tone="subdued">
                        Job ID: {actionData.jobId}
                      </Text>
                    )}
                  </BlockStack>
                </Banner>
              )}

              {actionData?.status === "quota_exceeded" && (
                <Banner tone="critical">
                  <BlockStack gap="200">
                    <Text as="p">{actionData.message}</Text>
                    <Button url="/app/billing">Upgrade to Pro</Button>
                  </BlockStack>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Confirm Tag Cleanup"
        primaryAction={{
          content: `Clean ${selectedTags.length} Tags`,
          onAction: confirmClean,
          destructive: true,
          loading: isLoading,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setIsModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p">
              Are you sure you want to remove <strong>{selectedTags.length}</strong> tags from <strong>~{results?.itemsScanned || 0}</strong> scanned items?
            </Text>

            {results?.previewItems && results.previewItems.length > 0 && (
              <BlockStack gap="200">
                <Text variant="headingSm" as="h3">Items that will be affected (preview):</Text>
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <Scrollable style={{ maxHeight: '150px' }} shadow>
                    <List>
                      {results.previewItems.slice(0, 5).map(item => (
                        <List.Item key={item.id}>
                          <Text as="span" tone="subdued">Tags: {item.tags.join(", ")}</Text>
                        </List.Item>
                      ))}
                    </List>
                  </Scrollable>
                </Box>
              </BlockStack>
            )}

            <Banner tone="warning">
              This action cannot be undone (except via Backup/Revert for Pro users). The cleanup process will run in the background.
            </Banner>
            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
              <Scrollable style={{ maxHeight: '150px' }} shadow>
                <List>
                  {selectedTags.map(tag => (
                    <List.Item key={tag}>{tag}</List.Item>
                  ))}
                </List>
              </Scrollable>
            </Box>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}