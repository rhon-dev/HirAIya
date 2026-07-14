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
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight">
            HirAIya
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Board
            </Link>
            <Link href="/roadmap" className="hover:text-foreground">
              Roadmap
            </Link>
            {currentUser.role === "ADMIN" && (
              <Link href="/admin" className="hover:text-foreground">
                Admin
              </Link>
            )}
          </nav>
        </div>
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
