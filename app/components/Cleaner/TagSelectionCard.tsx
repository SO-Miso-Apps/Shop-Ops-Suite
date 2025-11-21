import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  EmptyState,
  InlineStack,
  List,
  ProgressBar,
  Scrollable,
  Text
} from "@shopify/polaris";
import type { ScanResults } from "~/types/cleaner.types";

interface TagSelectionCardProps {
  results?: ScanResults;
  isCleaned: boolean;
  isLoading: boolean;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onScan: () => void;
  onClean: () => void;
  progress: number;
  actionMessage?: string;
  actionJobId?: string;
  quotaExceeded?: boolean;
  quotaMessage?: string;
}

export function TagSelectionCard({
  results,
  isCleaned,
  isLoading,
  selectedTags,
  onToggleTag,
  onScan,
  onClean,
  progress,
  actionMessage,
  actionJobId,
  quotaExceeded,
  quotaMessage
}: TagSelectionCardProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">AI Tag Scanner (Deep Scan)</Text>
        <Text as="p">
          Scan up to 2000 products and customers to find messy tags.
        </Text>

        {!results && !isCleaned && (
          <Button onClick={onScan} loading={isLoading} variant="primary">
            Start Deep Scan
          </Button>
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
                                onChange={() => onToggleTag(tag)}
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
                                onChange={() => onToggleTag(tag)}
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
                      onClick={onClean}
                      disabled={selectedTags.length === 0}
                      loading={isLoading}
                    >
                      Clean {`${selectedTags.length}`} Selected Tags
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
              <Text as="p">{actionMessage}</Text>
              {actionJobId && (
                <Text as="p" tone="subdued">
                  Job ID: {actionJobId}
                </Text>
              )}
            </BlockStack>
          </Banner>
        )}

        {quotaExceeded && (
          <Banner tone="critical">
            <BlockStack gap="200">
              <Text as="p">{quotaMessage}</Text>
              <Button url="/app/billing">Upgrade to Pro</Button>
            </BlockStack>
          </Banner>
        )}
      </BlockStack>
    </Card>
  );
}
