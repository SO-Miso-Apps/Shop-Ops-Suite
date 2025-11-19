import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { payload, topic, shop } = await authenticate.webhook(request);
    console.log(`Received ${topic} webhook for ${shop}`);

    const current = payload.current as string[];

    // TODO: Update session scopes in MongoDB when Shop model is implemented
    console.log(`Updated scopes for ${shop}:`, current);

    return new Response();
};
