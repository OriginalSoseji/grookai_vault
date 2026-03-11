"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, Suspense, useEffect, useState } from "react";
import PersistentSearchBar, { PersistentSearchBarFallback } from "@/components/PersistentSearchBar";
import { supabase } from "@/lib/supabaseClient";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const showTopSearch = pathname === "/explore" || pathname.startsWith("/search");

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
          <div className={showTopSearch ? "mx-auto max-w-5xl space-y-3 px-4 py-3" : "mx-auto max-w-5xl px-4 py-3"}>
            <div className="flex items-center justify-between gap-4">
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
            {showTopSearch ? (
              <Suspense fallback={<PersistentSearchBarFallback />}>
                <PersistentSearchBar />
              </Suspense>
            ) : null}
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-4 text-center text-sm text-slate-600">
            <Link href="/legal" className="underline-offset-4 hover:text-slate-900 hover:underline">
              Legal
            </Link>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
