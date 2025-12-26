"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/catalog" className="text-lg font-semibold">
              Grookai Vault Web (MVP)
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/catalog" className="hover:underline">
                Catalog
              </Link>
              <Link href="/vault" className="hover:underline">
                Vault
              </Link>
              {signedIn ? (
                <button
                  className="rounded bg-slate-900 px-3 py-1 text-white hover:bg-slate-700"
                  onClick={() => supabase.auth.signOut()}
                >
                  Sign out
                </button>
              ) : (
                <Link href="/login" className="rounded border px-3 py-1 hover:bg-slate-100">
                  Login
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
