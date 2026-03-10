"use client";

import { useEffect, useRef, useState } from "react";
import PublicCardImage from "@/components/PublicCardImage";

type PublicCardImageLightboxProps = {
  src?: string;
  alt: string;
  imageClassName: string;
  fallbackClassName: string;
};

export default function PublicCardImageLightbox({
  src,
  alt,
  imageClassName,
  fallbackClassName,
}: PublicCardImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const triggerElement = triggerRef.current;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      triggerElement?.focus();
    };
  }, [isOpen]);

  if (!src) {
    return (
      <PublicCardImage
        src={src}
        alt={alt}
        imageClassName={imageClassName}
        fallbackClassName={fallbackClassName}
      />
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="block w-full cursor-zoom-in rounded-2xl transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        aria-label={`Open larger image for ${alt}`}
      >
        <PublicCardImage
          src={src}
          alt={alt}
          imageClassName={imageClassName}
          fallbackClassName={fallbackClassName}
        />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Large image for ${alt}`}
          onClick={() => setIsOpen(false)}
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 rounded-full border border-white/20 bg-slate-900/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label="Close enlarged image"
          >
            Close
          </button>

          <div className="relative max-w-[min(92vw,720px)]" onClick={(event) => event.stopPropagation()}>
            <PublicCardImage
              src={src}
              alt={alt}
              imageClassName="max-h-[85vh] w-auto max-w-full rounded-3xl object-contain shadow-2xl"
              fallbackClassName="flex aspect-[3/4] w-[min(92vw,420px)] items-center justify-center rounded-3xl bg-slate-100 px-4 text-center text-sm text-slate-500"
            />
          </div>
        </div>
      )}
    </>
  );
}
