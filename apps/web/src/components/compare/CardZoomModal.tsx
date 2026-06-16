"use client";

import { useEffect, useRef, useState } from "react";
import PublicCardImage from "@/components/PublicCardImage";

type CardZoomModalProps = {
  src?: string;
  fallbackSrc?: string;
  alt: string;
  imageClassName: string;
  fallbackClassName: string;
};

export default function CardZoomModal({ src, fallbackSrc, alt, imageClassName, fallbackClassName }: CardZoomModalProps) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const hasImage = Boolean(src?.trim() || fallbackSrc?.trim());

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!hasImage) {
    return (
      <PublicCardImage
        src={src}
        fallbackSrc={fallbackSrc}
        alt={alt}
        imageClassName={imageClassName}
        fallbackClassName={fallbackClassName}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full cursor-zoom-in text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        aria-label={`Open enlarged preview for ${alt}`}
      >
        <PublicCardImage
          src={src}
          fallbackSrc={fallbackSrc}
          alt={alt}
          imageClassName={`${imageClassName} transition duration-150 hover:scale-[1.02]`}
          fallbackClassName={fallbackClassName}
        />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Enlarged preview for ${alt}`}
          className="animate-fade fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/88 p-4 backdrop-blur-sm sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex max-h-[90dvh] max-w-[90vw] items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-slate-950/85 text-2xl leading-none text-white shadow-lg transition hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Close enlarged image preview"
            >
              <span aria-hidden="true">&times;</span>
            </button>
            <PublicCardImage
              src={src}
              fallbackSrc={fallbackSrc}
              alt={alt}
              imageClassName="block h-auto max-h-[90dvh] w-auto max-w-[90vw] rounded-[20px] bg-white object-contain shadow-2xl ring-1 ring-white/15"
              fallbackClassName="flex aspect-[3/4] h-auto max-h-[90dvh] w-[min(90vw,28rem)] items-center justify-center rounded-[20px] bg-white px-6 text-center text-sm text-slate-500 shadow-2xl ring-1 ring-white/15"
              sizes="(max-width: 640px) 92vw, 80vw"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
