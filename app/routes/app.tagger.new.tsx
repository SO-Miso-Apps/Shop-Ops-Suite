import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useFetcher, useNavigate, useLoaderData } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect, useState } from "react";
import { RuleFormModal } from "~/components/Tagger/RuleFormModal";
import { useTaggerForm } from "~/hooks/useTaggerForm";
import { AIService } from "../services/ai.service";
import { TaggerService } from "../services/tagger.service";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { UsageService } = await import("~/services/usage.service");
  const plan = await UsageService.getPlanType(session.shop);

  if (plan === "Free") {
    const activeCount = await TaggerService.countActiveRules(session.shop);
    if (activeCount >= 5) {
      // Ideally redirect or show error, but for now we let the UI handle the "limit reached" warning if needed, 
      // or we could block access. The parent route shows the banner.
      // Let's just return the status.
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
    const ruleData = JSON.parse(formData.get("ruleData") as string);

    // Check limits if enabling or creating new
    if (ruleData.isEnabled) {
      const { UsageService } = await import("~/services/usage.service");
      const plan = await UsageService.getPlanType(session.shop);
      if (plan === "Free") {
        const activeCount = await TaggerService.countActiveRules(session.shop);
        // Since this is create, we always check count
        if (activeCount >= 5) {
          return json({ status: "error", message: "Free plan limit reached." }, { status: 403 });
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

export default function NewTaggerRule() {
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher();

  const [aiPrompt, setAiPrompt] = useState("");

  const {
    formData,
    setFormData,
    errors,
    setErrors,
    validateForm,
    initCreateForm
  } = useTaggerForm();

  useEffect(() => {
    initCreateForm();
  }, []);

  useEffect(() => {
    if (actionData?.status === "success" || (fetcher.data as any)?.status === "success") {
      if ((actionData as any)?.generatedRule || (fetcher.data as any)?.generatedRule) {
        const rule = (actionData as any)?.generatedRule || (fetcher.data as any)?.generatedRule;
        setFormData({
          ...formData,
          name: rule.name || formData.name,
          resourceType: rule.resourceType || formData.resourceType,
          conditionLogic: rule.conditionLogic || 'AND',
          conditions: rule.conditions || [],
          tags: rule.tags || []
        });
        shopify.toast.show("Rule generated!");
      } else {
        shopify.toast.show("Rule created");
        navigate("/app/tagger");
      }
    } else if ((actionData as any)?.status === "error" || (fetcher.data as any)?.status === "error") {
      setErrors({
        common: (actionData as any)?.message || (fetcher.data as any)?.message || "An error occurred"
      });
    }
  }, [actionData, fetcher.data, shopify, navigate]);

  const handleSave = () => {
    if (!validateForm()) return;
    fetcher.submit({ actionType: "saveRule", ruleData: JSON.stringify(formData) }, { method: "post" });
  };

  const handleGenerateAI = () => {
    fetcher.submit({ actionType: "generateRule", prompt: aiPrompt, resourceType: formData.resourceType }, { method: "post" });
  };

  return (
    <RuleFormModal
      open={true}
      onClose={() => navigate("/app/tagger")}
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
