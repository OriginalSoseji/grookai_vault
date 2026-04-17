import { redirect } from "next/navigation";
import { buildLoginHref, normalizeNextPath } from "@/lib/auth/routeAccess";
import { createServerComponentClient } from "@/lib/supabase/server";

export async function getOptionalServerUser() {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function requireServerUser(nextPath: string) {
  const { supabase, user } = await getOptionalServerUser();

  if (!user) {
    redirect(buildLoginHref(normalizeNextPath(nextPath)));
  }

  return { supabase, user };
}
