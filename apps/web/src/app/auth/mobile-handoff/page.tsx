"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_NEXT_PATH = "/vault";

function getSafeNextPath(rawValue?: string | null) {
  return rawValue && rawValue.startsWith("/") && !rawValue.startsWith("//")
    ? rawValue
    : DEFAULT_NEXT_PATH;
}

function parseHashParams(hash: string) {
  return new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
}

export default function MobileAuthHandoffPage() {
  const [nextPath, setNextPath] = useState(DEFAULT_NEXT_PATH);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const hashParams = parseHashParams(window.location.hash);
      const requestedNextPath = getSafeNextPath(
        hashParams.get("next") ?? new URLSearchParams(window.location.search).get("next"),
      );

      if (!cancelled) {
        setNextPath(requestedNextPath);
      }

      window.history.replaceState(
        null,
        document.title,
        `/auth/mobile-handoff?next=${encodeURIComponent(requestedNextPath)}`,
      );

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (!accessToken || !refreshToken) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) {
          return;
        }

        if (session != null) {
          window.location.replace(requestedNextPath);
          return;
        }

        setErrorMessage("Grookai could not confirm your signed-in session for this tool.");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (cancelled) {
        return;
      }

      if (error != null) {
        setErrorMessage(error.message);
        return;
      }

      window.location.replace(requestedNextPath);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-full rounded-[28px] border border-slate-200 bg-white px-6 py-8 shadow-sm">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Grookai
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
          Opening your tool
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Confirming your signed-in session and taking you to the real product route.
        </p>
        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-left">
            <p className="text-sm font-medium text-rose-700">Session handoff failed.</p>
            <p className="mt-1 text-sm leading-6 text-rose-700">{errorMessage}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Try again
              </button>
              <Link
                href={`/login?next=${encodeURIComponent(nextPath)}`}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open login
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
