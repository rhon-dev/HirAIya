import { prisma } from "@/lib/prisma";
import type { User } from "@/app/generated/prisma/client";

// Single demo user, no login, no roles — mood tracking is inherently personal,
// so there's no multi-user/role-switcher like the feedback platform had.
export async function getCurrentUser(): Promise<User> {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) throw new Error("No user seeded — run `npm run db:seed`");
  return user;
}
