import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useFetcher, useNavigate, useLoaderData } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect, useState } from "react";
import { RuleFormModal } from "~/components/Tagger/RuleFormModal";
import { useTaggerForm } from "~/hooks/useTaggerForm";
import { AIService } from "../services/ai.service";
import { TaggerService } from "../services/tagger.service";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;
  if (!id) return json({ rule: null }, { status: 404 });

  const rules = await TaggerService.getRules(session.shop);
  const rule = rules.find((r: any) => r._id.toString() === id);

  if (!rule) return json({ rule: null }, { status: 404 });

  return json({ rule });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "saveRule") {
    const ruleData = JSON.parse(formData.get("ruleData") as string);

    // Check limits if enabling
    if (ruleData.isEnabled) {
      const { UsageService } = await import("~/services/usage.service");
      const plan = await UsageService.getPlanType(session.shop);
      if (plan === "Free") {
        const activeCount = await TaggerService.countActiveRules(session.shop);
        // For edit, we check if we are enabling a previously disabled rule
        // But here we just check total count. If it's already enabled, it counts towards the limit.
        // If it was disabled and we enable it, we check if activeCount < 5.
        // However, activeCount includes ALL active rules.
        // If we are editing an ACTIVE rule, it's already in the count.
        // If we are editing an INACTIVE rule and enabling it, we need to check if there's room.

        // To be safe and simple:
        // 1. Get current rule state from DB
        const existing = ruleData._id ? (await TaggerService.getRules(session.shop)).find((r: any) => r._id.toString() === ruleData._id) : null;

        if (existing && !existing.isEnabled && ruleData.isEnabled) {
          if (activeCount >= 5) {
            return json({ status: "error", message: "Free plan limit reached." }, { status: 403 });
          }
        }
      }
    }

    await TaggerService.saveRule(session.shop, ruleData);
    return json({ status: "success" });
  } else if (actionType === "generateRule") {
    const prompt = formData.get("prompt") as string;
    const resourceType = formData.get("resourceType") as string;
    try {
      const generatedRule = await AIService.generateRuleFromPrompt(prompt, resourceType);
      return json({ status: "success", generatedRule });
    } catch (error) {
      return json({ status: "error", message: "Failed to generate rule" }, { status: 500 });
    }
  }

  return json({ status: "success" });
};

export default function EditTaggerRule() {
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher();
  const { rule } = useLoaderData<typeof loader>();

  const [aiPrompt, setAiPrompt] = useState("");

  const {
    formData,
    setFormData,
    errors,
    validateForm,
    initEditForm
  } = useTaggerForm();

  useEffect(() => {
    if (rule) {
      initEditForm(rule);
    }
  }, [rule]);

  useEffect(() => {
    if (actionData?.status === "success" || (fetcher.data as any)?.status === "success") {
      if ((actionData as any)?.generatedRule || (fetcher.data as any)?.generatedRule) {
        const generated = (actionData as any)?.generatedRule || (fetcher.data as any)?.generatedRule;
        setFormData({
          ...formData,
          name: generated.name || formData.name,
          resourceType: generated.resourceType || formData.resourceType,
          conditionLogic: generated.conditionLogic || 'AND',
          conditions: generated.conditions || [],
          tags: generated.tags || []
        });
        shopify.toast.show("Rule generated!");
      } else {
        shopify.toast.show("Rule updated");
        navigate("/app/tagger");
      }
    } else if ((actionData as any)?.status === "error" || (fetcher.data as any)?.status === "error") {
      shopify.toast.show((actionData as any)?.message || (fetcher.data as any)?.message || "An error occurred", { isError: true });
    }
  }, [actionData, fetcher.data, shopify, navigate]);

  const handleSave = () => {
    if (!validateForm()) return;
    fetcher.submit({ actionType: "saveRule", ruleData: JSON.stringify(formData) }, { method: "post" });
  };

  const handleGenerateAI = () => {
    fetcher.submit({ actionType: "generateRule", prompt: aiPrompt, resourceType: formData.resourceType }, { method: "post" });
  };

  if (!rule) return null;

  return (
    <RuleFormModal
      open={true}
      onClose={() => navigate("/app/tagger")}
      editingRule={rule}
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
