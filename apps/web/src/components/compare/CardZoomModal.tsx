"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full cursor-zoom-in text-left">
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
          className="animate-fade fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-sm sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div className="flex h-[calc(100dvh-2rem)] w-full max-w-5xl items-center justify-center sm:h-[calc(100dvh-3rem)]" onClick={(event) => event.stopPropagation()}>
            <PublicCardImage
              src={src}
              fallbackSrc={fallbackSrc}
              alt={alt}
              imageClassName="h-full max-h-full w-auto max-w-full rounded-[22px] bg-white/95 object-contain p-3 shadow-2xl ring-1 ring-white/15 sm:p-4"
              fallbackClassName="flex min-h-[20rem] w-full max-w-md items-center justify-center rounded-[22px] bg-white/95 px-6 text-center text-sm text-slate-500 shadow-2xl ring-1 ring-white/15"
              sizes="(max-width: 640px) 92vw, 80vw"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
