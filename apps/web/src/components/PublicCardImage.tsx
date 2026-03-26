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
};

export default function PublicCardImage({
  src,
  fallbackSrc,
  alt,
  imageClassName,
  fallbackClassName,
  fallbackLabel = "Image unavailable",
  loading,
}: PublicCardImageProps) {
  const [activeSrc, setActiveSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    const normalizedPrimary = typeof src === "string" && src.trim().length > 0 ? src.trim() : undefined;
    const normalizedFallback =
      typeof fallbackSrc === "string" && fallbackSrc.trim().length > 0 ? fallbackSrc.trim() : undefined;

    setActiveSrc(normalizedPrimary ?? normalizedFallback);
  }, [fallbackSrc, src]);

  const normalizedPrimary = typeof src === "string" && src.trim().length > 0 ? src.trim() : undefined;
  const normalizedFallback =
    typeof fallbackSrc === "string" && fallbackSrc.trim().length > 0 ? fallbackSrc.trim() : undefined;
  const canFallback =
    Boolean(normalizedFallback) && Boolean(normalizedPrimary) && normalizedFallback !== normalizedPrimary;

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
