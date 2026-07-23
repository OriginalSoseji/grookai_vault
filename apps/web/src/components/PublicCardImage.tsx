"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  normalizePublicCardImageSrc,
  shouldBypassNextImageOptimization,
} from "@/lib/publicCardImage";

type PublicCardImageProps = {
  src?: string;
  fallbackSrc?: string;
  fallbackSources?: Array<string | null | undefined>;
  alt: string;
  imageClassName: string;
  fallbackClassName: string;
  fallbackLabel?: ReactNode;
  loading?: "eager" | "lazy";
  decoding?: "async" | "auto" | "sync";
  priority?: boolean;
  sizes?: string;
  unoptimized?: boolean;
};

export default function PublicCardImage({
  src,
  fallbackSrc,
  fallbackSources = [],
  alt,
  imageClassName,
  fallbackClassName,
  fallbackLabel = "Image unavailable",
  loading,
  decoding,
  priority = false,
  sizes = "(max-width: 640px) 42vw, (max-width: 1024px) 25vw, 220px",
  unoptimized = false,
}: PublicCardImageProps) {
  const normalizedPrimary = normalizePublicCardImageSrc(src);
  const normalizedFallback = normalizePublicCardImageSrc(fallbackSrc);
  const normalizedFallbackSources = fallbackSources
    .map((candidate) => normalizePublicCardImageSrc(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));
  const sourceChain = [
    normalizedPrimary,
    normalizedFallback,
    ...normalizedFallbackSources,
  ].filter(
    (candidate, index, candidates): candidate is string =>
      Boolean(candidate) && candidates.indexOf(candidate) === index,
  );
  const initialSrc = normalizedPrimary ?? normalizedFallback ?? normalizedFallbackSources[0];
  const sourceChainKey = sourceChain.join("\u0000");
  const [activeSrc, setActiveSrc] = useState<string | undefined>(initialSrc);
  const renderUnoptimized = unoptimized || shouldBypassNextImageOptimization(activeSrc);

  useEffect(() => {
    // LOCK: Public card images should render a server-usable initial source when possible.
    // LOCK: Hydration must not be required just to choose the first image source.
    setActiveSrc(initialSrc);
  }, [initialSrc, sourceChainKey]);

  if (!activeSrc) {
    return <div className={fallbackClassName}>{fallbackLabel}</div>;
  }

  return (
    <Image
      src={activeSrc}
      alt={alt}
      loading={priority ? undefined : loading}
      decoding={decoding}
      priority={priority}
      fetchPriority={priority ? "high" : undefined}
      className={imageClassName}
      width={1200}
      height={1600}
      sizes={sizes}
      unoptimized={renderUnoptimized}
      onError={() => {
        const activeIndex = activeSrc ? sourceChain.indexOf(activeSrc) : -1;
        const nextSrc = activeIndex >= 0 ? sourceChain[activeIndex + 1] : undefined;
        if (nextSrc) {
          setActiveSrc(nextSrc);
          return;
        }

        setActiveSrc(undefined);
      }}
    />
  );
}
