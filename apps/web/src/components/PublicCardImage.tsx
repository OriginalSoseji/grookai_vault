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
  alt: string;
  imageClassName: string;
  fallbackClassName: string;
  fallbackLabel?: ReactNode;
  loading?: "eager" | "lazy";
  priority?: boolean;
  sizes?: string;
  unoptimized?: boolean;
};

export default function PublicCardImage({
  src,
  fallbackSrc,
  alt,
  imageClassName,
  fallbackClassName,
  fallbackLabel = "Image unavailable",
  loading,
  priority = false,
  sizes = "(max-width: 640px) 42vw, (max-width: 1024px) 25vw, 220px",
  unoptimized = false,
}: PublicCardImageProps) {
  const normalizedPrimary = normalizePublicCardImageSrc(src);
  const normalizedFallback = normalizePublicCardImageSrc(fallbackSrc);
  const initialSrc = normalizedPrimary ?? normalizedFallback;
  const [activeSrc, setActiveSrc] = useState<string | undefined>(initialSrc);
  const canFallback =
    Boolean(normalizedFallback) && Boolean(normalizedPrimary) && normalizedFallback !== normalizedPrimary;
  const renderUnoptimized = unoptimized || shouldBypassNextImageOptimization(activeSrc);

  useEffect(() => {
    // LOCK: Public card images should render a server-usable initial source when possible.
    // LOCK: Hydration must not be required just to choose the first image source.
    setActiveSrc(initialSrc);
  }, [initialSrc]);

  if (!activeSrc) {
    return <div className={fallbackClassName}>{fallbackLabel}</div>;
  }

  return (
    <Image
      src={activeSrc}
      alt={alt}
      loading={priority ? undefined : loading}
      priority={priority}
      fetchPriority={priority ? "high" : undefined}
      className={imageClassName}
      width={1200}
      height={1600}
      sizes={sizes}
      unoptimized={renderUnoptimized}
      onError={() => {
        if (canFallback && activeSrc === normalizedPrimary) {
          setActiveSrc(normalizedFallback);
          return;
        }

        setActiveSrc(undefined);
      }}
    />
  );
}
