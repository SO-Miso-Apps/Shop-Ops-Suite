import type { LoaderFunctionArgs } from '@remix-run/node';
import { ActivityService } from '~/services/activity.service';
import { authenticate, BillingPlans } from '~/shopify.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing, redirect } = await authenticate.admin(request);
  const url = new URL(request.url);
  const chargeId = url.searchParams.get('charge_id') as string;
  const plan = url.searchParams.get('plan') as BillingPlans;
  try {
    // Use billing.check to verify the subscription
    const billingCheck = await billing.check({
      plans: [plan],
      isTest: process.env.NODE_ENV !== "production",
    });

    if (billingCheck.hasActivePayment) {
      const { ShopConfig } = await import("../models/ShopConfig");
      await ShopConfig.findOneAndUpdate(
        { shop: session.shop },
        {
          isActive: true,
          updatedAt: new Date()
        },
        { upsert: true }
      );

      await ActivityService.createLog({
        shop: session.shop,
        resourceType: "Billing",
        resourceId: plan,
        action: "Billing Confirmed",
        detail: `${plan} plan subscription confirmed and activated`,
        status: "Success",
      });
    }
    return redirect('/app/billing');
  } catch (error) {
    console.error("Error verifying billing:", error);
    return redirect('/app/billing');
  }
};
