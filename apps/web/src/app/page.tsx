"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/catalog");
      else router.replace("/login");
    });
  }, [router]);

  return <p className="text-sm text-slate-600">Redirecting…</p>;
}
