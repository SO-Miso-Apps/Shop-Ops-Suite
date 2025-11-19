import { type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { webhookQueue } from "../queue.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

    if (!admin) {
        // The admin context isn't returned if the webhook is processed successfully but we need it?
        // Actually authenticate.webhook returns payload and topic.
        // We don't need admin here, we just push to queue.
    }

    console.log(`Received webhook ${topic} for ${shop}`);

    // Push to queue
    await webhookQueue.add(topic, {
        shop,
        topic,
        payload,
    });

    return new Response();
};
