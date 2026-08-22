"use client";

import { useMemo, useState } from "react";

import CardZoomModal from "@/components/compare/CardZoomModal";
import type { CardImageFace } from "@/types/cards";

type CardFaceGalleryProps = {
  faces: CardImageFace[];
  faceNames?: string[];
  alt: string;
};

function faceLabel(face: CardImageFace, faceNames?: string[]) {
  const namedFace = faceNames?.[face.face_index]?.trim();
  if (namedFace) return namedFace;
  if (face.face_role === "front") return "Front";
  if (face.face_role === "back") return "Back";
  return `Face ${face.face_index + 1}`;
}

export default function CardFaceGallery({
  faces,
  faceNames,
  alt,
}: CardFaceGalleryProps) {
  const orderedFaces = useMemo(
    () => [...faces].sort((left, right) => left.face_index - right.face_index),
    [faces],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedFace = orderedFaces[selectedIndex] ?? orderedFaces[0];

  if (!selectedFace) return null;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <CardZoomModal
        src={selectedFace.image_url}
        alt={`${alt}, ${faceLabel(selectedFace, faceNames)}`}
        imageClassName="h-auto max-h-[560px] w-full cursor-zoom-in rounded-[18px] object-contain shadow-[0_24px_60px_-40px_rgba(15,23,42,0.82)] transition duration-150 hover:scale-[1.006] sm:max-h-[620px]"
        fallbackClassName="flex aspect-[5/7] w-full items-center justify-center rounded-[18px] bg-white/42 px-4 text-center text-sm font-medium text-slate-400 ring-1 ring-inset ring-slate-200/40 dark:bg-white/[0.04] dark:text-slate-600 dark:ring-white/[0.05]"
        sizes="(max-width: 1024px) 86vw, 390px"
        priority={selectedIndex === 0}
      />
      <div
        className="grid w-full grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]"
        role="tablist"
        aria-label="Card faces"
      >
        {orderedFaces.map((face, index) => {
          const selected = index === selectedIndex;
          const label = faceLabel(face, faceNames);
          return (
            <button
              key={`${face.face_index}:${face.face_role}`}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setSelectedIndex(index)}
              className={`min-h-10 rounded-md px-3 py-2 text-sm font-semibold transition ${
                selected
                  ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
