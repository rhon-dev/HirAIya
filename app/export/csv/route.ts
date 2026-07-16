import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { entriesToCsv } from "@/lib/export";

// Exports must reflect the live DB on every request, never a build-time snapshot.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const entries = await prisma.moodEntry.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
  });
  return new Response(entriesToCsv(entries), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mood-entries.csv"',
    },
  });
}
