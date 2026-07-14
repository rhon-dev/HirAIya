import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { UserSwitcher } from "@/components/user-switcher";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const [users, currentUser] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    getCurrentUser(),
  ]);

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          HirAIya
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/feedback/new">New feedback</Link>
          </Button>
          <UserSwitcher
            users={users.map(({ id, name, role }) => ({ id, name, role }))}
            currentUser={{
              id: currentUser.id,
              name: currentUser.name,
              role: currentUser.role,
            }}
          />
        </div>
      </div>
    </header>
  );
}
