"use client";

import { useEffect, useState } from "react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { supabase } from "@/lib/supabaseClient";

type ShellAuthState = {
  isAuthenticated: boolean;
  profileHref: string | null;
  wallHref: string | null;
  networkUnreadCount: number;
};

const DEFAULT_SHELL_AUTH_STATE: ShellAuthState = {
  isAuthenticated: false,
  profileHref: null,
  wallHref: "/wall",
  networkUnreadCount: 0,
};

export function AppChrome({
  dexEnabled,
  bindersEnabled,
}: {
  dexEnabled: boolean;
  bindersEnabled: boolean;
}) {
  const [authState, setAuthState] = useState<ShellAuthState>(DEFAULT_SHELL_AUTH_STATE);

  useEffect(() => {
    let cancelled = false;
    let requestVersion = 0;

    async function loadAuthenticatedShell() {
      const currentRequestVersion = ++requestVersion;
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled || currentRequestVersion !== requestVersion) {
        return;
      }

      if (!session?.user) {
        setAuthState(DEFAULT_SHELL_AUTH_STATE);
        return;
      }

      try {
        // LOCK: Public routes must not depend on global auth/session reads in the root chrome.
        // LOCK: Auth-aware navigation belongs in authenticated/private surfaces only.
        const response = await fetch("/api/navigation/shell", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload = (await response.json().catch(() => null)) as Partial<ShellAuthState> | null;

        if (
          !cancelled &&
          currentRequestVersion === requestVersion &&
          response.ok &&
          payload?.isAuthenticated
        ) {
          setAuthState({
            isAuthenticated: true,
            profileHref: typeof payload.profileHref === "string" ? payload.profileHref : null,
            wallHref: typeof payload.wallHref === "string" ? payload.wallHref : null,
            networkUnreadCount:
              typeof payload.networkUnreadCount === "number" ? payload.networkUnreadCount : 0,
          });
        } else if (!cancelled && currentRequestVersion === requestVersion) {
          setAuthState(DEFAULT_SHELL_AUTH_STATE);
        }
      } catch {
        if (!cancelled && currentRequestVersion === requestVersion) {
          setAuthState(DEFAULT_SHELL_AUTH_STATE);
        }
      }
    }

    void loadAuthenticatedShell();

    const { data: subscription } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session?.user) {
        requestVersion += 1;
        setAuthState(DEFAULT_SHELL_AUTH_STATE);
        return;
      }

      void loadAuthenticatedShell();
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <SiteHeader
        isAuthenticated={authState.isAuthenticated}
        profileHref={authState.profileHref}
        networkUnreadCount={authState.networkUnreadCount}
        dexEnabled={dexEnabled}
        bindersEnabled={bindersEnabled}
      />
      <MobileBottomNav wallHref={authState.wallHref} dexEnabled={dexEnabled} />
    </>
  );
}

export default AppChrome;
