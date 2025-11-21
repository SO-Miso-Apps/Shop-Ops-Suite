import { json, type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, useNavigation, useSubmit, useLoaderData, Link } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Box,
  Layout,
  Page,
  ProgressBar,
  Text
} from "@shopify/polaris";
import { useEffect, useState } from "react";
import { CleanConfirmModal } from "~/components/Cleaner/CleanConfirmModal";
import { TagSelectionCard } from "~/components/Cleaner/TagSelectionCard";
import { useCleanerState } from "~/hooks/useCleanerState";
import type { CleanerActionData } from "~/types/cleaner.types";
import { authenticate } from "../shopify.server";
import { cleanerQueue } from "../queue.server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { UsageService } from "../services/usage.service";
import { generateJobId } from "~/utils/id-generator";

export const loader = async ({ request }: { request: Request }) => {
  const { session } = await authenticate.admin(request);

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
    const MAX_ITEMS = 2000;
    const allTags: string[] = [];
    const itemsWithTags: Array<{ id: string; tags: string[] }> = [];

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

    const productCount = await scanResourceTags("products", MAX_ITEMS);
    const customerCount = await scanResourceTags("customers", MAX_ITEMS);

    const uniqueTags = [...new Set(allTags)];
    const duplicateTags: string[] = [];
    const malformedTags: string[] = [];
    const lowerCaseMap = new Map<string, string>();

    uniqueTags.forEach(tag => {
      const lower = tag.toLowerCase();
      if (lowerCaseMap.has(lower)) {
        const existing = lowerCaseMap.get(lower);
        if (existing && !duplicateTags.includes(existing)) duplicateTags.push(existing);
        duplicateTags.push(tag);
      } else {
        lowerCaseMap.set(lower, tag);
      }
    });

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
        previewItems: itemsWithTags.slice(0, 10),
      }
    });

  } else if (actionType === "cleanTags") {
    const tagsToRemove = JSON.parse(formData.get("tags") as string);
    const affectedCount = parseInt(formData.get("affectedCount") as string);

    const quotaCheck = await UsageService.checkQuota(session.shop, affectedCount);
    if (!quotaCheck.allowed) {
      return json({
        status: "quota_exceeded",
        message: quotaCheck.message,
        current: quotaCheck.current,
        limit: quotaCheck.limit,
      });
    }

    const jobId = generateJobId();
    await cleanerQueue.add("clean-tags", {
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
  const actionData = useActionData<typeof action>() as CleanerActionData;

  const [isShowUpgradeBanner, setShowUpgradeBanner] = useState(true);
  const shopify = useAppBridge();
  const submit = useSubmit();
  const nav = useNavigation();
  const isLoading = nav.state === "submitting";

  const {
    selectedTags,
    toggleTag,
    isModalOpen,
    openModal,
    closeModal
  } = useCleanerState();

  const [progress, setProgress] = useState(0);

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

  const calculateAffectedCount = () => {
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
    closeModal();
  };

  const usagePercent = loaderData.limit
    ? Math.round((loaderData.usage.count / loaderData.limit) * 100)
    : 0;

  return (
    <Page title="Data Cleaner">
      <Layout>
        <Layout.Section>
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
          <TagSelectionCard
            results={results}
            isCleaned={isCleaned}
            isLoading={isLoading}
            selectedTags={selectedTags}
            onToggleTag={toggleTag}
            onScan={handleScan}
            onClean={openModal}
            progress={progress}
            actionMessage={actionData?.message || `Cleanup job queued! ${actionData?.count} tag(s) will be removed.`}
            actionJobId={actionData?.jobId}
            quotaExceeded={actionData?.status === "quota_exceeded"}
            quotaMessage={actionData?.message}
          />
        </Layout.Section>
      </Layout>

      <CleanConfirmModal
        open={isModalOpen}
        onClose={closeModal}
        onConfirm={confirmClean}
        isLoading={isLoading}
        selectedTags={selectedTags}
        results={results}
      />
    </Page>
  );
}