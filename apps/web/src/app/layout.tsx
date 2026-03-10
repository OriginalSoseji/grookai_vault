"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

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
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-3 text-lg font-semibold text-slate-950">
              <Image
                src="/grookai-emblem-square.svg"
                alt="Grookai Vault logo"
                width={36}
                height={36}
                className="rounded-md"
              />
              <span>Grookai Vault</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <Link href="/explore" className="hover:underline">
                Explore
              </Link>
              {signedIn ? (
                <>
                  <Link href="/vault" className="hover:underline">
                    Vault
                  </Link>
                  <button
                    className="rounded bg-slate-900 px-3 py-1 text-white hover:bg-slate-700"
                    onClick={() => supabase.auth.signOut()}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link href="/login" className="rounded border px-3 py-1 hover:bg-slate-100">
                  Login
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
