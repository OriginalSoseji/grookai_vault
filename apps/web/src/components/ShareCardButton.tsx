"use client";

import { useState } from "react";
import { shareCard } from "@/lib/shareCard";

type ShareCardButtonProps = {
  gvId: string;
};

export default function ShareCardButton({ gvId }: ShareCardButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const ok = await shareCard(gvId);

    if (!ok) {
      return;
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="text-xs text-slate-500 transition hover:text-slate-700"
    >
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
