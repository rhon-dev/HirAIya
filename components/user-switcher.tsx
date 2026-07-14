"use client";

import { useTransition } from "react";
import { switchUser } from "@/app/users/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserOption = {
  id: string;
  name: string;
  role: "ADMIN" | "MEMBER";
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserSwitcher({
  users,
  currentUser,
}: {
  users: UserOption[];
  currentUser: UserOption;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2" disabled={isPending}>
          <Avatar className="size-6">
            <AvatarFallback className="text-xs">
              {initials(currentUser.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{currentUser.name}</span>
          {currentUser.role === "ADMIN" && <Badge variant="outline">Admin</Badge>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Demo user</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {users.map((user) => (
          <DropdownMenuItem
            key={user.id}
            disabled={user.id === currentUser.id}
            onSelect={() => startTransition(() => switchUser(user.id))}
          >
            <Avatar className="size-5">
              <AvatarFallback className="text-[10px]">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            {user.name}
            {user.role === "ADMIN" && (
              <span className="ml-auto text-xs text-muted-foreground">Admin</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
