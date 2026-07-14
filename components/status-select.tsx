"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { changeStatus } from "@/app/feedback/actions";
import { STATUS_LABELS } from "@/components/feedback-badges";
import type { Status } from "@/app/generated/prisma/enums";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StatusSelect({
  feedbackId,
  status,
}: {
  feedbackId: string;
  status: Status;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(async () => {
      const result = await changeStatus(feedbackId, value as Status);
      if (result?.error) toast.error(result.error);
      else toast.success(`Status changed to ${STATUS_LABELS[value as Status]}`);
    });
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
