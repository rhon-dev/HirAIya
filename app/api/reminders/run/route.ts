import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { todayUTC } from "@/lib/mood";
import { shouldSendReminder } from "@/lib/reminder";
import { sendPushToAll } from "@/lib/push";

export const dynamic = "force-dynamic";

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  const url = new URL(request.url);
  const provided =
    url.searchParams.get("secret") ??
    request.headers.get("authorization")?.replace(/^Bearer /, "") ??
    "";
  if (!secretsMatch(provided, secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getCurrentUser();
  const today = todayUTC();
  const entry = await prisma.moodEntry.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
  });
  const decision = shouldSendReminder(user, entry !== null, today, new Date());
  if (!decision.send) {
    return Response.json({ sent: false, reason: decision.reason });
  }

  const { delivered, removed } = await sendPushToAll({
    title: "HirAIya Mood",
    body: "How are you feeling today?",
  });
  if (delivered > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { reminderLastSentDate: today },
    });
  }
  return Response.json({ sent: delivered > 0, delivered, removed });
}
