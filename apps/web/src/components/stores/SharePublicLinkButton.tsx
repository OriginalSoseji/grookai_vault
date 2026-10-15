"use client";

import { useState } from "react";

export function SharePublicLinkButton({
  title,
  label = "Share",
  className = "",
}: {
  title: string;
  label?: string;
  className?: string;
}) {
  const [status, setStatus] = useState(label);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setStatus("Shared");
      } else {
        await navigator.clipboard.writeText(url);
        setStatus("Link copied");
      }
    } catch {
      setStatus("Share unavailable");
    }
    window.setTimeout(() => setStatus(label), 2200);
  }

  return <button type="button" onClick={() => void share()} className={className}>{status}</button>;
}
