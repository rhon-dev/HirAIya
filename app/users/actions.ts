"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { USER_COOKIE } from "@/lib/auth";

export async function switchUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const cookieStore = await cookies();
  cookieStore.set(USER_COOKIE, user.id, { path: "/", httpOnly: true });
  revalidatePath("/", "layout");
}
