"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function getSafeNextPath(nextPath?: string) {
  return nextPath && nextPath.startsWith("/") ? nextPath : "/vault";
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
    const redirectUrl = new URL("/auth/callback", window.location.origin);
    redirectUrl.searchParams.set("next", getSafeNextPath(nextPath));

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl.toString(),
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
