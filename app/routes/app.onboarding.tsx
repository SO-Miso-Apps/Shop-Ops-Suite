import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useSubmit } from "@remix-run/react";
import {
    BlockStack,
    Box,
    Button,
    Card,
    Layout,
    Page,
    Text
} from "@shopify/polaris";
import { Settings } from "../models/Settings";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session, redirect } = await authenticate.admin(request);
    const settings = await Settings.findOne({ shop: session.shop });
    console.log("settings", settings);
    if (settings?.onboardingCompleted) {
        return redirect("/app");
    }

    return json({ step: settings?.step || 1 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const action = formData.get("action");
    const shop = session.shop;

    let settings = await Settings.findOne({ shop });
    if (!settings) {
        settings = await Settings.create({ shop });
    }

    if (action === "complete_onboarding") {
        settings.onboardingCompleted = true;
        await settings.save();
        return redirect("/app");
    }

    return null;
};

export default function Onboarding() {
    const submit = useSubmit();

    const handleComplete = () => {
        const formData = new FormData();
        formData.append("action", "complete_onboarding");
        submit(formData, { method: "post" });
    };

    return (
        <Page>
            <Layout>
                <Layout.Section>
                    <Card>
                        <Box padding="600">
                            <BlockStack gap="500" align="center">
                                <Text variant="heading2xl" as="h1">Welcome to Shop-Ops Suite</Text>
                                <Text variant="bodyLg" as="p" alignment="center">
                                    Automate your shop operations with smart tagging rules,
                                    AI-powered insights, and powerful bulk operations.
                                </Text>
                                <Box paddingBlockStart="400">
                                    <Button variant="primary" size="large" onClick={handleComplete}>
                                        Get Started
                                    </Button>
                                </Box>
                            </BlockStack>
                        </Box>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
