import { BlockStack, Box, Button, Card, Icon, InlineStack, ProgressBar, Text } from "@shopify/polaris";
import { CheckCircleIcon, MinusIcon } from "@shopify/polaris-icons";
import { useNavigate } from "@remix-run/react";

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  action: string;
  url: string;
  completed: boolean;
}

interface SetupGuideProps {
  steps: SetupStep[];
  onDismiss: () => void;
}

export function SetupGuide({ steps, onDismiss }: SetupGuideProps) {
  const navigate = useNavigate();
  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  if (completedCount === steps.length) {
    return null; // Don't show if all done (or maybe show a success state?)
  }

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="headingMd" as="h2">
            Setup Guide
          </Text>
          <Button variant="plain" onClick={onDismiss}>
            Dismiss
          </Button>
        </InlineStack>

        <BlockStack gap="200">
          <InlineStack align="space-between">
            <Text variant="bodySm" as="span">
              {completedCount} of {steps.length} tasks completed
            </Text>
            <Text variant="bodySm" as="span">
              {Math.round(progress)}%
            </Text>
          </InlineStack>
          <ProgressBar progress={progress} size="small" tone="primary" />
        </BlockStack>

        <Box paddingBlockStart="200">
          <BlockStack gap="300">
            {steps.map((step, index) => (
              <Box
                key={step.id}
                background={step.completed ? "bg-surface-secondary" : "bg-surface"}
                padding="300"
                borderRadius="200"
                borderWidth="025"
                borderColor="border"
              >
                <InlineStack align="space-between" blockAlign="center" wrap={false} gap="400">
                  <InlineStack gap="300" wrap={false}>
                    <Box minWidth="20px">
                      <Icon
                        source={step.completed ? CheckCircleIcon : MinusIcon}
                        tone={step.completed ? "success" : "subdued"}
                      />
                    </Box>
                    <BlockStack gap="050">
                      <Text
                        variant="bodyMd"
                        as="p"
                        fontWeight={step.completed ? "regular" : "semibold"}
                        tone={step.completed ? "subdued" : undefined}
                        textDecorationLine={step.completed ? "line-through" : undefined}
                      >
                        {step.title}
                      </Text>
                      <Text variant="bodySm" as="p" tone="subdued">
                        {step.description}
                      </Text>
                    </BlockStack>
                  </InlineStack>

                  {!step.completed && (
                    <Button onClick={() => navigate(step.url)} size="slim">
                      {step.action}
                    </Button>
                  )}
                </InlineStack>
              </Box>
            ))}
          </BlockStack>
        </Box>
      </BlockStack>
    </Card>
  );
}
