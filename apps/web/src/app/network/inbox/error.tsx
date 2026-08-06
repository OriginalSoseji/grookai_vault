"use client";

import ProductState from "@/components/layout/ProductState";

export default function InboxError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-12">
      <ProductState
        tone="error"
        eyebrow="Messages unavailable"
        title="Card messages could not load"
        description="No message, trade, sale, or card state was changed. Try loading your messages again."
        action={<button type="button" className="gv-primary-button" onClick={reset}>Try again</button>}
        secondaryAction={<a href="/network" className="gv-secondary-button">Open Pulse</a>}
      />
    </div>
  );
}
