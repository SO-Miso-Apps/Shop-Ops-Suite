import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { Page, Layout, Card, Button, Text, BlockStack, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { seedLibrary } from "../utils/seeding.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  try {
    const result = await seedLibrary(shop);
    return json({ status: "success", message: `Successfully seeded ${result.createdTaggers} Tagger rules and ${result.createdMetafields} Metafield rules.` });
  } catch (error) {
    console.error("Seeding error:", error);
    return json({ status: "error", message: "Failed to seed library." }, { status: 500 });
  }
};

export default function SeedPage() {
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const isLoading = nav.state === "submitting";

  return (
    <Page title="Seed Library">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="p" variant="bodyMd">
                Click the button below to seed the database with a library of Tagging and Metafield rules.
                This will create 30 rules of each type (Simple, Medium, Advanced) if they do not already exist.
              </Text>

              {actionData?.status === "success" && (
                <Banner title="Success" tone="success">
                  <p>{actionData.message}</p>
                </Banner>
              )}

              {actionData?.status === "error" && (
                <Banner title="Error" tone="critical">
                  <p>{actionData.message}</p>
                </Banner>
              )}

              <Form method="post">
                <Button submit loading={isLoading} variant="primary">
                  Seed Library
                </Button>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
