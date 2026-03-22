"use client";

import { useEffect, useState } from "react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { supabase } from "@/lib/supabaseClient";

type ShellAuthState = {
  isAuthenticated: boolean;
  profileHref: string | null;
  wallHref: string | null;
};

const DEFAULT_SHELL_AUTH_STATE: ShellAuthState = {
  isAuthenticated: false,
  profileHref: null,
  wallHref: null,
};

async function resolveShellAuthState(userId: string): Promise<ShellAuthState> {
  const { data, error } = await supabase
    .from("public_profiles")
    .select("slug,public_profile_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[shell-auth] profile lookup failed", error.message);
    return {
      isAuthenticated: true,
      profileHref: null,
      wallHref: null,
    };
  }

  const slug = typeof data?.slug === "string" ? data.slug.trim() : "";
  const profileHref = slug ? `/u/${slug}` : null;
  const wallHref = slug && data?.public_profile_enabled ? `/u/${slug}` : null;

  return {
    isAuthenticated: true,
    profileHref,
    wallHref,
  };
}

export function AppChrome() {
  const [authState, setAuthState] = useState<ShellAuthState>(DEFAULT_SHELL_AUTH_STATE);

  useEffect(() => {
    let cancelled = false;

    async function syncAuthState(userId?: string | null) {
      if (!userId) {
        if (!cancelled) {
          setAuthState(DEFAULT_SHELL_AUTH_STATE);
        }
        return;
      }

      const nextState = await resolveShellAuthState(userId);
      if (!cancelled) {
        setAuthState(nextState);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      void syncAuthState(data.session?.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncAuthState(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <SiteHeader
        isAuthenticated={authState.isAuthenticated}
        profileHref={authState.profileHref}
      />
      <MobileBottomNav wallHref={authState.wallHref} />
    </>
  );
}

export default AppChrome;
