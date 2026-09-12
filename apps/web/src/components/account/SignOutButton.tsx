"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function signOut() {
    setBusy(true);
    setError(false);
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
      // A full navigation also clears cached authenticated React page state.
      window.location.replace("/login");
    } catch { setError(true); setBusy(false); }
  }
  return <div>
    <button type="button" className="gv-secondary-button inline-flex items-center gap-2" disabled={busy} onClick={signOut}>
      <LogOut size={16} />{busy ? "Signing out..." : "Sign out"}
    </button>
    {error ? <p role="alert">Sign-out could not be confirmed. Please try again.</p> : null}
  </div>;
}
