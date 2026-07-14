import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  StatusBadge,
} from "@/components/feedback-badges";
import { CategoryChart } from "@/components/category-chart";
import { Category, Status } from "@/app/generated/prisma/enums";

export default async function AdminPage() {
  const currentUser = await getCurrentUser();
  if (currentUser.role !== "ADMIN") redirect("/");

  const [total, byStatus, byCategory, recentChanges] = await Promise.all([
    prisma.feedback.count(),
    prisma.feedback.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.statusChange.findMany({
      include: { feedback: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const statusCounts = Object.values(Status).map((status) => ({
    status,
    count: byStatus.find((row) => row.status === status)?._count._all ?? 0,
  }));
  const categoryData = Object.values(Category).map((category) => ({
    name: CATEGORY_LABELS[category],
    count: byCategory.find((row) => row.category === category)?._count._all ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Admin dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Feedback volume and status breakdown.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Total feedback</p>
            <p className="text-2xl font-semibold">{total}</p>
          </CardContent>
        </Card>
        {statusCounts.map(({ status, count }) => (
          <Card key={status} className="py-4">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">
                {STATUS_LABELS[status]}
              </p>
              <p className="text-2xl font-semibold">{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feedback by category</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryChart data={categoryData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent status changes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentChanges.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No status changes yet.
            </p>
          ) : (
            <ul className="divide-y">
              {recentChanges.map((change) => (
                <li
                  key={change.id}
                  className="flex flex-wrap items-center gap-2 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {change.feedback.title}
                  </span>
                  <StatusBadge status={change.fromStatus} />
                  <span className="text-muted-foreground">→</span>
                  <StatusBadge status={change.toStatus} />
                  <span className="text-xs text-muted-foreground">
                    {change.createdAt.toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
