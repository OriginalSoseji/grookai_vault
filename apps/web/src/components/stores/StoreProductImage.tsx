"use client";
/* eslint-disable @next/next/no-img-element -- guarded private media must recheck access for each request */
import { useState } from "react";

export function StoreProductImage({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  if (!src || failedSource === src)
    return (
      <div
        role="img"
        aria-label="Vendor photo unavailable"
        className="flex min-h-32 items-center justify-center p-4 text-center text-sm text-slate-500"
      >
        Photo unavailable
      </div>
    );
  return (
    <img
      ref={(element) => {
        if (element?.complete && element.naturalWidth === 0)
          setFailedSource(src);
      }}
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailedSource(src)}
    />
  );
}
