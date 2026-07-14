import { Badge } from "@/components/ui/badge";
import type { Category, Status } from "@/app/generated/prisma/enums";
import { cn } from "@/lib/utils";

const CATEGORY_STYLES: Record<Category, string> = {
  UI: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  UX: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  FEATURE: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  BUG: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  ENHANCEMENT: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
};

const STATUS_STYLES: Record<Status, string> = {
  SUGGESTION: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  PLANNED: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  LIVE: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

const STATUS_LABELS: Record<Status, string> = {
  SUGGESTION: "Suggestion",
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  LIVE: "Live",
};

const CATEGORY_LABELS: Record<Category, string> = {
  UI: "UI",
  UX: "UX",
  FEATURE: "Feature",
  BUG: "Bug",
  ENHANCEMENT: "Enhancement",
};

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", CATEGORY_STYLES[category])}>
      {CATEGORY_LABELS[category]}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export { STATUS_LABELS, CATEGORY_LABELS };
