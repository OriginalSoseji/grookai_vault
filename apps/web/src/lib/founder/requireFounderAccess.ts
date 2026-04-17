import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { requireServerUser } from "@/lib/auth/requireServerUser";

export const FOUNDER_EMAIL = "ccabrl@gmail.com";

export function isFounderUser(user: Pick<User, "email"> | null | undefined) {
  return Boolean(user?.email && user.email.toLowerCase() === FOUNDER_EMAIL.toLowerCase());
}

export async function getFounderAuthUser() {
  const { user } = await requireServerUser("/founder");
  return user;
}

export async function requireFounderAccess(nextPath: string) {
  const { user } = await requireServerUser(nextPath);

  if (!isFounderUser(user)) {
    redirect("/");
  }

  return { user };
}
