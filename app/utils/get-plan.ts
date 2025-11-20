import { BillingPlans } from "~/shopify.server";

export const getPlan = (plan: BillingPlans | "Free") => {
  if (plan === "Free") {
    return "Free";
  }

  if (plan.includes("Pro")) {
    return "Pro";
  }
}