import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// Sends a push to every stored subscription. Subscriptions the push service
// reports gone (404/410) are deleted; other failures are left in place so a
// transient outage doesn't wipe valid subscriptions.
export async function sendPushToAll(payload: {
  title: string;
  body: string;
}): Promise<{ delivered: number; removed: number }> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured");
  }
  webpush.setVapidDetails("mailto:admin@hiraiya.dev", publicKey, privateKey);

  const subscriptions = await prisma.pushSubscription.findMany();
  let delivered = 0;
  let removed = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
      delivered++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
        removed++;
      }
    }
  }
  return { delivered, removed };
}
