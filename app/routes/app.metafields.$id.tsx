import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useFetcher, useNavigate, useLoaderData } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect, useState } from "react";
import { MetafieldFormModal } from "~/components/Metafield/MetafieldFormModal";
import { useMetafieldForm } from "~/hooks/useMetafieldForm";
import { MetafieldService } from "../services/metafield.service";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;
  if (!id) return json({ rule: null }, { status: 404 });

  const rules = await MetafieldService.getRules(session.shop);
  const rule = rules.find((r: any) => r._id.toString() === id);

  if (!rule) return json({ rule: null }, { status: 404 });

  return json({ rule });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "saveRule") {
    const ruleData = JSON.parse(formData.get("rule") as string);

    if (ruleData._id) {
      try {
        await MetafieldService.updateRule(ruleData._id, ruleData);
      } catch (error) {
        return json({ status: "error", message: (error as Error).message }, { status: 400 });
      }
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

export default function EditMetafieldRule() {
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
  } = useMetafieldForm();

  useEffect(() => {
    if (rule) {
      initEditForm(rule);
    }
  }, [rule]);

  useEffect(() => {
    if (actionData?.status === "success" || (fetcher.data as any)?.status === "success") {
      if ((actionData as any)?.rule || (fetcher.data as any)?.rule) {
        const generated = (actionData as any)?.rule || (fetcher.data as any)?.rule;
        setFormData({
          ...formData,
          name: generated.name || formData.name,
          resourceType: generated.resourceType || formData.resourceType,
          conditionLogic: generated.conditionLogic || 'AND',
          conditions: generated.conditions || [],
          definition: generated.definition || formData.definition
        });
        shopify.toast.show("Rule generated!");
      } else {
        shopify.toast.show("Rule updated");
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

  if (!rule) return null;

  return (
    <MetafieldFormModal
      open={true}
      onClose={() => navigate("/app/metafields")}
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
