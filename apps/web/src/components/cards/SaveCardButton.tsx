"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SaveCardButton({ cardPrintId, loginHref, isAuthenticated, refreshOnChange = false, initialSaved }: {
  cardPrintId: string; loginHref: string; isAuthenticated: boolean;
  refreshOnChange?: boolean;
  initialSaved?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved ?? false);
  const [busy, setBusy] = useState(initialSaved === undefined);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError(null);
    if (!isAuthenticated || initialSaved !== undefined) {
      setSaved(isAuthenticated && Boolean(initialSaved));
      setBusy(false);
      return;
    }
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setBusy(false); return; }
      const { data, error: readError } = await supabase.from("wishlist_items")
        .select("id").eq("user_id", user.id).eq("card_id", cardPrintId).maybeSingle();
      if (!active) return;
      if (readError) setError("Saved status is unavailable.");
      else setSaved(Boolean(data));
      setBusy(false);
    })().catch(() => { if (active) { setError("Saved status is unavailable."); setBusy(false); } });
    return () => { active = false; };
  }, [cardPrintId, isAuthenticated, initialSaved]);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) throw new Error("Sign in again to save cards.");
      const query = saved
        ? supabase.from("wishlist_items").delete().eq("user_id", user.id).eq("card_id", cardPrintId)
        : supabase.from("wishlist_items").upsert({ user_id: user.id, card_id: cardPrintId }, { onConflict: "user_id,card_id", ignoreDuplicates: true });
      const { error: writeError } = await query;
      if (writeError) throw writeError;
      const { data, error: readError } = await supabase.from("wishlist_items")
        .select("id").eq("user_id", user.id).eq("card_id", cardPrintId).maybeSingle();
      if (readError || Boolean(data) === saved) throw new Error("Save could not be confirmed.");
      setSaved(Boolean(data));
      if (refreshOnChange) router.refresh();
    } catch { setError("Could not confirm the change. Reload before trying again."); }
    finally { setBusy(false); }
  }

  if (!isAuthenticated) return <Link className="gv-detail-save" href={loginHref}><Heart size={16} />Save</Link>;
  return <div>
    <button className="gv-detail-save" type="button" aria-pressed={saved} disabled={busy || Boolean(error)} onClick={toggle}>
      <Heart size={16} fill={saved ? "currentColor" : "none"} />{busy ? "Saving..." : saved ? "Saved" : "Save"}
    </button>
    {error ? <p role="alert" className="text-xs">{error}</p> : null}
  </div>;
}
