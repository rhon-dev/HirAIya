import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { User } from "@/app/generated/prisma/client";

const USER_COOKIE = "demo-user-id";

// Demo-user stub: current user comes from a cookie set by the user switcher.
// Falls back to the first member so the app works before any switch happens.
export async function getCurrentUser(): Promise<User> {
  const cookieStore = await cookies();
  const id = cookieStore.get(USER_COOKIE)?.value;

  if (id) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (user) return user;
  }

  const fallback = await prisma.user.findFirst({
    where: { role: "MEMBER" },
    orderBy: { createdAt: "asc" },
  });
  if (!fallback) throw new Error("No users seeded — run `npm run db:seed`");
  return fallback;
}

export function canModify(
  user: Pick<User, "id" | "role">,
  resource: { authorId: string }
): boolean {
  return user.role === "ADMIN" || user.id === resource.authorId;
}

export { USER_COOKIE };
