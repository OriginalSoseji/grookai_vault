"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type ClientViewerState = {
  userId: string | null;
  isAuthenticated: boolean;
  hasCheckedSession: boolean;
};

export function useClientViewer(initialUserId: string | null = null): ClientViewerState {
  const [userId, setUserId] = useState<string | null>(initialUserId);
  const [hasCheckedSession, setHasCheckedSession] = useState(Boolean(initialUserId));

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!cancelled) {
        setUserId(session?.user?.id ?? null);
        setHasCheckedSession(true);
      }
    }

    void loadSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
      setHasCheckedSession(true);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return {
    userId,
    isAuthenticated: Boolean(userId),
    hasCheckedSession,
  };
}
