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
        className={`flex h-full min-h-32 w-full items-center justify-center rounded-xl bg-slate-100/80 p-4 text-center text-sm font-medium text-slate-500 dark:bg-white/[0.04] dark:text-slate-400 ${className ?? ""}`.trim()}
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
