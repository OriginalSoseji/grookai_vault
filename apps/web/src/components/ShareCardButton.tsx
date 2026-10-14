"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { shareCard } from "@/lib/shareCard";
import { useClientReady } from "@/components/layout/useClientReady";

type ShareCardButtonProps = {
  gvId: string;
  variant?: "default" | "menu";
};

export default function ShareCardButton({ gvId, variant = "default" }: ShareCardButtonProps) {
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
      className={
        variant === "menu"
          ? "flex min-h-12 w-full items-center gap-3 px-3 py-3 text-left text-sm font-medium text-slate-800 transition active:scale-[0.99] hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/[0.04]"
          : "text-xs text-slate-500 transition hover:text-slate-700"
      }
    >
      {variant === "menu" ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-4 w-4 fill-none stroke-current"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7.5 7.5 12.5 2.5" />
            <path d="M9.5 2.5h3v3" />
            <path d="M12 7.5v7H4.5v-7h3" />
          </svg>
        </span>
      ) : null}
      <span aria-live="polite">{copied ? "Link copied" : variant === "menu" ? "Copy card link" : "Share"}</span>
    </button>
    {message ? <span className="gv-detail-share-status" role="status">{message}</span> : null}
  </>);
}
