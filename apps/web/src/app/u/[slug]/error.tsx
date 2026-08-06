"use client";

import Link from "next/link";
import ProductState from "@/components/layout/ProductState";

export default function CollectorProfileError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-12">
      <ProductState
        tone="error"
        eyebrow="Collector unavailable"
        title="This profile could not load"
        description="No follow, message, or collection action was changed."
        action={<button type="button" className="gv-primary-button" onClick={reset}>Try again</button>}
        secondaryAction={<Link href="/explore" className="gv-secondary-button">Search cards</Link>}
      />
    </div>
  );
}
