import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createServerComponentClient } from "@/lib/supabase/server";

export const FOUNDER_EMAIL = "ccabrl@gmail.com";

export function isFounderUser(user: Pick<User, "email"> | null | undefined) {
  return Boolean(user?.email && user.email.toLowerCase() === FOUNDER_EMAIL.toLowerCase());
}

export async function getFounderAuthUser() {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireFounderAccess(nextPath: string) {
  const user = await getFounderAuthUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!isFounderUser(user)) {
    redirect("/");
  }

  return { user };
}
