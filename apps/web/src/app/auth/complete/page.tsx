"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function getSafeNextPath(nextParam?: string | null) {
  return nextParam && nextParam.startsWith("/") ? nextParam : "/vault";
}

export default function AuthCompletePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finishSignIn = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const nextPath = getSafeNextPath(hashParams.get("next"));

      if (!accessToken || !refreshToken) {
        router.replace("/login?error=oauth_callback_failed");
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (cancelled) {
        return;
      }

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      router.replace(nextPath);
    };

    finishSignIn();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="mx-auto max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-950">Finishing sign in</h1>
      <p className="mt-3 text-sm text-slate-600">
        {error ? error : "Completing your Google sign-in and sending you to your vault."}
      </p>
    </div>
  );
}
