import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toExportRow } from "@/lib/export";

// Exports must reflect the live DB on every request, never a build-time snapshot.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const entries = await prisma.moodEntry.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
  });
  return new Response(JSON.stringify(entries.map(toExportRow), null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="mood-entries.json"',
    },
  });
}
