"use client";
import { useEffect } from "react";
export function StoreEntry({ slug }: { slug: string }) {
  useEffect(() => {
    void fetch(`/api/stores/${encodeURIComponent(slug)}/referral`, {
      method: "POST",
      cache: "no-store",
    }).catch(() => undefined);
  }, [slug]);
  return null;
}
