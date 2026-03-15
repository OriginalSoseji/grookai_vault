"use client";

import GoogleSignInButton from "@/components/GoogleSignInButton";
import { sendTelemetryEvent } from "@/lib/telemetry/client";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function getSafeNextPath(nextParam?: string | null) {
  return nextParam && nextParam.startsWith("/") ? nextParam : "/vault";
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get("next"));
  const callbackError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(
    callbackError === "oauth_callback_failed" ? "Google sign-in could not be completed." : null,
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (signUpData.user?.id) {
          sendTelemetryEvent({
            eventName: "account_created",
            path: nextPath,
            userId: signUpData.user.id,
            metadata: {
              auth_method: "email_password",
            },
          });
        }
      }
      router.replace(nextPath);
    } catch (err: any) {
      setError(err?.message ?? "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded border bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-xl font-semibold">Sign {mode === "signin" ? "in" : "up"}</h1>
      <div className="space-y-3">
        <GoogleSignInButton
          label="Sign in with Google"
          className="w-full rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          nextPath={nextPath}
          onError={setError}
        />
        <p className="text-center text-xs uppercase tracking-[0.18em] text-slate-400">or use email</p>
      </div>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium">
          Email
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
            className="w-full rounded bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? "Working..." : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <div className="mt-4 text-sm">
        {mode === "signin" ? (
          <button className="text-blue-700 hover:underline" onClick={() => setMode("signup")}>
            Need an account? Sign up
          </button>
        ) : (
          <button className="text-blue-700 hover:underline" onClick={() => setMode("signin")}>
            Have an account? Sign in
          </button>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md rounded border bg-white p-6 shadow-sm text-sm text-slate-600">Loading sign-in...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
