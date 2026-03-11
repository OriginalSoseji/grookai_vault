"use client";

import { useEffect, useState } from "react";

type PublicCardImageProps = {
  src?: string;
  alt: string;
  imageClassName: string;
  fallbackClassName: string;
  fallbackLabel?: string;
  loading?: "eager" | "lazy";
};

export default function PublicCardImage({
  src,
  alt,
  imageClassName,
  fallbackClassName,
  fallbackLabel = "Image unavailable",
  loading,
}: PublicCardImageProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  if (!src || imageFailed) {
    return <div className={fallbackClassName}>{fallbackLabel}</div>;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={imageClassName}
      onError={() => setImageFailed(true)}
    />
  );
}
