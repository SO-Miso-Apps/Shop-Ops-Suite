import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useFetcher, useNavigate, useLoaderData } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect, useState } from "react";
import { MetafieldFormModal } from "~/components/Metafield/MetafieldFormModal";
import { useMetafieldForm } from "~/hooks/useMetafieldForm";
import { MetafieldService } from "../services/metafield.service";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { UsageService } = await import("~/services/usage.service");
  const plan = await UsageService.getPlanType(session.shop);

  if (plan === "Free") {
    const count = await MetafieldService.countRules(session.shop);
    if (count >= 5) {
      return json({ isLimitReached: true });
    }
  }
  return json({ isLimitReached: false });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "saveRule") {
    const ruleData = JSON.parse(formData.get("rule") as string);

    const { UsageService } = await import("~/services/usage.service");
    const plan = await UsageService.getPlanType(session.shop);
    if (plan === "Free") {
      const count = await MetafieldService.countRules(session.shop);
      if (count >= 5) {
        return json({ status: "error", message: "Free plan limit reached. Upgrade to Pro to create more rules." }, { status: 403 });
      }
    }
    try {
      await MetafieldService.createRule(session.shop, ruleData);
    } catch (error) {
      return json({ status: "error", message: (error as Error).message }, { status: 400 });
    }
  } else if (actionType === "generateRule") {
    const prompt = formData.get("prompt") as string;
    const resourceType = formData.get("resourceType") as string;
    const { AIService } = await import("~/services/ai.service");
    try {
      const rule = await AIService.generateMetafieldRuleFromPrompt(prompt, resourceType);
      return json({ status: "success", rule });
    } catch (error) {
      return json({ status: "error", message: "Failed to generate rule" }, { status: 500 });
    }
  }

  return json({ status: "success" });
};

export default function NewMetafieldRule() {
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher();
  const { isLimitReached } = useLoaderData<typeof loader>();

  const [aiPrompt, setAiPrompt] = useState("");

  const {
    formData,
    setFormData,
    errors,
    validateForm,
    initCreateForm
  } = useMetafieldForm();

  useEffect(() => {
    initCreateForm();
  }, []);

  useEffect(() => {
    if (actionData?.status === "success" || (fetcher.data as any)?.status === "success") {
      if ((actionData as any)?.rule || (fetcher.data as any)?.rule) {
        const rule = (actionData as any)?.rule || (fetcher.data as any)?.rule;
        setFormData({
          ...formData,
          name: rule.name || formData.name,
          resourceType: rule.resourceType || formData.resourceType,
          conditionLogic: rule.conditionLogic || 'AND',
          conditions: rule.conditions || [],
          definition: rule.definition || formData.definition
        });
        shopify.toast.show("Rule generated!");
      } else {
        shopify.toast.show("Rule created");
        navigate("/app/metafields");
      }
    } else if ((actionData as any)?.status === "error" || (fetcher.data as any)?.status === "error") {
      shopify.toast.show((actionData as any)?.message || (fetcher.data as any)?.message || "An error occurred", { isError: true });
    }
  }, [actionData, fetcher.data, shopify, navigate]);

  const handleSave = () => {
    if (!validateForm()) return;
    fetcher.submit({ actionType: "saveRule", rule: JSON.stringify(formData) }, { method: "post" });
  };

  const handleGenerateAI = () => {
    fetcher.submit({ actionType: "generateRule", prompt: aiPrompt, resourceType: formData.resourceType }, { method: "post" });
  };

  return (
    <MetafieldFormModal
      open={true}
      onClose={() => navigate("/app/metafields")}
      editingRule={null}
      formData={formData}
      onFormDataChange={setFormData}
      errors={errors}
      onSave={handleSave}
      isLoading={fetcher.state === "submitting"}
      aiPrompt={aiPrompt}
      onAiPromptChange={setAiPrompt}
      onGenerateAI={handleGenerateAI}
      isGenerating={fetcher.state === "submitting" && fetcher.formData?.get("actionType") === "generateRule"}
    />
  );
}
