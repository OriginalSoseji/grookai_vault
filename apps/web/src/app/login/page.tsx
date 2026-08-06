"use client";

import GoogleSignInButton from "@/components/GoogleSignInButton";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import { sendTelemetryEvent } from "@/lib/telemetry/client";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import {
  redactBinderSecretPath,
} from "@/lib/binders/safePath";
import { getSafePostAuthPath } from "@/lib/auth/routeAccess";

function getSafeNextPath(nextParam?: string | null) {
  return getSafePostAuthPath(nextParam);
}

function getDestinationCopy(nextPath: string) {
  if (nextPath === "/scan") {
    return { title: "Scan", description: "Sign in, then continue directly to the card scanner." };
  }
  if (nextPath === "/network/inbox") {
    return { title: "Messages", description: "Sign in, then return to your card conversations." };
  }
  if (nextPath === "/wall" || nextPath.startsWith("/wall?")) {
    return { title: "your Wall", description: "Sign in, then return to your shared collection." };
  }
  if (nextPath === "/binders" || nextPath.startsWith("/binders/")) {
    return { title: "Binders", description: "Sign in, then continue to your collection goals." };
  }
  if (nextPath === "/vault" || nextPath.startsWith("/vault/")) {
    return { title: "your Vault", description: "Sign in, then continue to your collection and exact copies." };
  }
  if (nextPath === "/account" || nextPath.startsWith("/account?")) {
    return { title: "your account", description: "Sign in, then continue to your account settings." };
  }
  return { title: "Grookai Vault", description: "Sign in to build your Vault, track exact cards, and connect with collectors." };
}

function getAuthErrorMessage(error: unknown, mode: "signin" | "signup") {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("invalid login") || message.includes("invalid credentials")) {
    return "The email or password did not match. Check both fields and try again.";
  }
  if (message.includes("email not confirmed")) {
    return "Confirm your email address before signing in.";
  }
  if (message.includes("already registered") || message.includes("already exists")) {
    return "An account already uses this email. Sign in instead.";
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts were made. Wait a moment and try again.";
  }
  return mode === "signin"
    ? "Sign-in could not be completed. Try again."
    : "Account creation could not be completed. Try again.";
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get("next"));
  const destination = getDestinationCopy(nextPath);
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
            path: redactBinderSecretPath(nextPath),
            userId: signUpData.user.id,
            metadata: {
              auth_method: "email_password",
            },
          });
        }
      }
      router.replace(nextPath);
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, mode));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-6">
      <PageIntro
        eyebrow="Account"
        title={mode === "signin" ? `Sign in to ${destination.title}` : `Create an account for ${destination.title}`}
        description={destination.description}
        size="compact"
      />

      <PageSection surface="card" spacing="loose" className="mx-auto w-full max-w-md">
        <div className="space-y-3">
          <GoogleSignInButton
            label="Sign in with Google"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            nextPath={nextPath}
            onError={setError}
          />
          <p className="text-center text-xs uppercase tracking-[0.18em] text-slate-400">or use email</p>
        </div>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            <span>Email</span>
            <input
              className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            <span>Password</span>
            <input
              className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            className="gv-primary-button w-full"
            type="submit"
            disabled={loading}
          >
            {loading ? "Working..." : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <div className="text-sm text-slate-600">
          {mode === "signin" ? (
            <button className="font-medium text-slate-700 hover:text-slate-950 hover:underline" onClick={() => setMode("signup")}>
              Need an account? Sign up
            </button>
          ) : (
            <button className="font-medium text-slate-700 hover:text-slate-950 hover:underline" onClick={() => setMode("signin")}>
              Have an account? Sign in
            </button>
          )}
        </div>
      </PageSection>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={(
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-6">
          <PageIntro
            eyebrow="Account"
            title="Sign in"
            description="Sign in to build your vault, track your cards, and share your collection."
            size="compact"
          />
          <PageSection surface="card" className="mx-auto w-full max-w-md text-sm text-slate-600">
            Loading sign-in...
          </PageSection>
        </div>
      )}
    >
      <LoginPageContent />
    </Suspense>
  );
}
