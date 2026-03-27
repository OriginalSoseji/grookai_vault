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
          className="animate-fade fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
            <PublicCardImage
              src={src}
              fallbackSrc={fallbackSrc}
              alt={alt}
              imageClassName="max-h-[90vh] w-full rounded-lg bg-white object-contain p-4 shadow-xl"
              fallbackClassName="flex min-h-[20rem] items-center justify-center rounded-lg bg-white px-6 text-center text-sm text-slate-500 shadow-xl"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
