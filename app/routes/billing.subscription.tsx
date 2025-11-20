import type { LoaderFunctionArgs } from '@remix-run/node';
import { ActivityService } from '~/services/activity.service';
import { authenticate, BillingPlans } from '~/shopify.server';
import { getMyshopify } from '~/utils/get-myshopify';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const myshopify = getMyshopify(session.shop);
  const url = new URL(request.url);
  const plan = url.searchParams.get('plan') as BillingPlans;
  if (!plan) return { status: 0 };
  await billing.request({
    plan: plan,
    isTest: process.env.NODE_ENV !== 'production',
    returnUrl: `https://admin.shopify.com/store/${myshopify}/apps/${process.env.SHOPIFY_API_KEY}/billing/subscription-confirm?plan=${plan}`,
  });
  await ActivityService.createLog({
    shop: session.shop,
    resourceType: "Billing",
    resourceId: plan,
    action: "Billing Request",
    detail: `${plan} plan subscription requested`,
    status: "Success",
  });
  return null;
};
