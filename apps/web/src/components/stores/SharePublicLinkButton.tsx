"use client";

import { useState } from "react";

export function SharePublicLinkButton({
  title,
  className = "",
}: {
  title: string;
  className?: string;
}) {
  const [label, setLabel] = useState("Share store");

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setLabel("Shared");
      } else {
        await navigator.clipboard.writeText(url);
        setLabel("Link copied");
      }
    } catch {
      setLabel("Share unavailable");
    }
    window.setTimeout(() => setLabel("Share store"), 2200);
  }

  return <button type="button" onClick={() => void share()} className={className}>{label}</button>;
}
