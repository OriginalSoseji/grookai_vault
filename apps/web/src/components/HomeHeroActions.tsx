"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HomeHeroActions() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/explore" className="rounded bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800">
        Explore cards
      </Link>
      <Link
        href={signedIn ? "/vault" : "/login"}
        className="rounded border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        {signedIn ? "My vault" : "Sign in"}
      </Link>
    </div>
  );
}
