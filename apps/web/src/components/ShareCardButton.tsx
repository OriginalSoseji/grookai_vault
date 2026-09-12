"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { shareCard } from "@/lib/shareCard";
import { useClientReady } from "@/components/layout/useClientReady";

type ShareCardButtonProps = {
  gvId: string;
  printingReference?: string | null;
  cardName?: string;
};

export default function ShareCardButton({ gvId, printingReference, cardName }: ShareCardButtonProps) {
  const ready = useClientReady();
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleShare() {
    if (printingReference !== undefined) {
      setBusy(true);
      setMessage("");
      const url = new URL(`/card/${encodeURIComponent(gvId)}`, window.location.origin);
      if (printingReference) url.searchParams.set("printing", printingReference);
      try {
        if (navigator.share) {
          try {
            await navigator.share({ title: cardName ?? gvId, url: url.href });
            setMessage("Shared");
            return;
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return;
          }
        }
        await navigator.clipboard.writeText(url.href);
        setMessage("Link copied");
      } catch {
        setMessage("Unable to share. Copy the link from your address bar.");
      } finally {
        setBusy(false);
      }
      return;
    }
    const ok = await shareCard(gvId);

    if (!ok) {
      return;
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (<>
    <button
      type="button"
      onClick={handleShare}
      disabled={!ready || busy}
      className="text-xs text-slate-500 transition hover:text-slate-700"
    >
      <Share2 size={15} aria-hidden="true" />
      {copied ? "Link copied" : "Share"}
    </button>
    {message ? <span className="gv-detail-share-status" role="status">{message}</span> : null}
  </>);
}
