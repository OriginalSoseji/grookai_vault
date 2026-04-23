"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type PublicCardImageProps = {
  src?: string;
  fallbackSrc?: string;
  alt: string;
  imageClassName: string;
  fallbackClassName: string;
  fallbackLabel?: string;
  loading?: "eager" | "lazy";
  sizes?: string;
};

export default function PublicCardImage({
  src,
  fallbackSrc,
  alt,
  imageClassName,
  fallbackClassName,
  fallbackLabel = "Image unavailable",
  loading,
  sizes = "(max-width: 640px) 42vw, (max-width: 1024px) 25vw, 220px",
}: PublicCardImageProps) {
  const normalizedPrimary = typeof src === "string" && src.trim().length > 0 ? src.trim() : undefined;
  const normalizedFallback =
    typeof fallbackSrc === "string" && fallbackSrc.trim().length > 0 ? fallbackSrc.trim() : undefined;
  const initialSrc = normalizedPrimary ?? normalizedFallback;
  const [activeSrc, setActiveSrc] = useState<string | undefined>(initialSrc);
  const canFallback =
    Boolean(normalizedFallback) && Boolean(normalizedPrimary) && normalizedFallback !== normalizedPrimary;

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
      loading={loading}
      className={imageClassName}
      width={1200}
      height={1600}
      sizes={sizes}
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
