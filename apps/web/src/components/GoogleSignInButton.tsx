"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getSafePostAuthPath } from "@/lib/auth/routeAccess";

const AUTH_NEXT_COOKIE = "grookai-auth-next";

function getSafeNextPath(nextPath?: string) {
  return getSafePostAuthPath(nextPath);
}

type GoogleSignInButtonProps = {
  className: string;
  label: string;
  nextPath?: string;
  onError?: (message: string) => void;
};

export default function GoogleSignInButton({ className, label, nextPath, onError }: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    const safeNextPath = getSafeNextPath(nextPath);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(safeNextPath)}; Path=/; Max-Age=${60 * 10}; SameSite=Lax${secure}`;
    const redirectTo = new URL("/auth/callback", window.location.origin);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Use the active browser origin so local OAuth callbacks follow the current dev port.
        redirectTo: redirectTo.toString(),
      },
    });

    if (error) {
      setLoading(false);
      onError?.(error.message);
    }
  };

  return (
    <button type="button" className={className} onClick={handleClick} disabled={loading}>
      {loading ? "Redirecting..." : label}
    </button>
  );
}
