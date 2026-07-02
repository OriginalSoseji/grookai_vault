import type { ReactNode } from "react";
import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import type { ViewDensity } from "@/hooks/useViewDensity";

type PokemonCardGridTileProps = {
  density?: ViewDensity;
  utility?: ReactNode;
  imageSrc?: string;
  imageFallbackSrc?: string;
  imageAlt: string;
  imageHref?: string;
  imagePrefetch?: boolean;
  imageLoading?: "eager" | "lazy";
  imagePriority?: boolean;
  imageSizes?: string;
  imageFallbackLabel?: string;
  imageClassName?: string;
  imageOverlay?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  meta?: ReactNode;
  summary?: ReactNode;
  details?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

type PokemonCardGridBadgeProps = {
  children: ReactNode;
  tone?: "default" | "accent" | "positive" | "warm" | "neutral";
  size?: "xs" | "sm";
  className?: string;
};

const TILE_PADDING_BY_DENSITY: Record<ViewDensity, string> = {
  compact: "p-2.5",
  default: "p-4",
  large: "p-5",
};

const IMAGE_PADDING_BY_DENSITY: Record<ViewDensity, string> = {
  compact: "p-2",
  default: "p-4",
  large: "p-5",
};

const CONTENT_STACK_BY_DENSITY: Record<ViewDensity, string> = {
  compact: "space-y-2",
  default: "space-y-3",
  large: "space-y-3.5",
};

const BODY_STACK_BY_DENSITY: Record<ViewDensity, string> = {
  compact: "space-y-2",
  default: "space-y-2.5",
  large: "space-y-3",
};

const TITLE_TEXT_BY_DENSITY: Record<ViewDensity, string> = {
  compact: "text-[13px]",
  default: "text-[15px]",
  large: "text-base",
};

const SUBTITLE_TEXT_BY_DENSITY: Record<ViewDensity, string> = {
  compact: "text-[11px]",
  default: "text-sm",
  large: "text-sm",
};

const META_TEXT_BY_DENSITY: Record<ViewDensity, string> = {
  compact: "text-[11px]",
  default: "text-xs",
  large: "text-xs",
};

const FOOTER_TEXT_BY_DENSITY: Record<ViewDensity, string> = {
  compact: "pt-2 text-[10px]",
  default: "pt-2.5 text-[11px]",
  large: "pt-3 text-xs",
};

function renderImage({
  density,
  imageSrc,
  imageFallbackSrc,
  imageAlt,
  imageLoading,
  imagePriority,
  imageSizes,
  imageFallbackLabel,
  imageClassName,
  imageOverlay,
}: {
  density: ViewDensity;
  imageSrc?: string;
  imageFallbackSrc?: string;
  imageAlt: string;
  imageLoading?: "eager" | "lazy";
  imagePriority?: boolean;
  imageSizes?: string;
  imageFallbackLabel?: string;
  imageClassName?: string;
  imageOverlay?: ReactNode;
}) {
  return (
    <div
      className={`gv-visual-card-image relative flex items-center justify-center overflow-hidden ${IMAGE_PADDING_BY_DENSITY[density]}`}
    >
      <PublicCardImage
        src={imageSrc}
        fallbackSrc={imageFallbackSrc}
        alt={imageAlt}
        loading={imageLoading}
        priority={imagePriority}
        sizes={imageSizes}
        imageClassName={`aspect-[3/4] w-full rounded-[14px] object-contain transition duration-200 group-hover:scale-[1.012] ${imageClassName ?? ""}`.trim()}
        fallbackClassName="flex aspect-[3/4] w-full items-center justify-center rounded-[14px] bg-white/42 px-4 text-center text-sm font-medium text-slate-400 ring-1 ring-inset ring-slate-200/40 dark:bg-white/[0.04] dark:text-slate-600 dark:ring-white/[0.05]"
        fallbackLabel={imageFallbackLabel ?? imageAlt}
      />
      {imageOverlay ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 pr-20">
          {imageOverlay}
        </div>
      ) : null}
    </div>
  );
}

export function PokemonCardGridBadge({
  children,
  tone = "default",
  size = "xs",
  className = "",
}: PokemonCardGridBadgeProps) {
  const sizeClassName =
    size === "sm"
      ? "px-2.5 py-1 text-xs font-medium tracking-normal"
      : "px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]";
  const toneClassName =
    tone === "accent"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : tone === "positive"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : tone === "warm"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : tone === "neutral"
            ? "border-slate-200/80 bg-white/80 text-slate-600"
            : "border-slate-200/80 bg-slate-50/80 text-slate-600";

  return (
    <span className={`inline-flex rounded-full border ${sizeClassName} ${toneClassName} ${className}`.trim()}>
      {children}
    </span>
  );
}

export default function PokemonCardGridTile({
  density = "default",
  utility,
  imageSrc,
  imageFallbackSrc,
  imageAlt,
  imageHref,
  imagePrefetch,
  imageLoading,
  imagePriority,
  imageSizes,
  imageFallbackLabel,
  imageClassName,
  imageOverlay,
  title,
  subtitle,
  badges,
  meta,
  summary,
  details,
  footer,
  className = "",
}: PokemonCardGridTileProps) {
  const image = renderImage({
    density,
    imageSrc,
    imageFallbackSrc,
    imageAlt,
    imageLoading,
    imagePriority,
    imageSizes,
    imageFallbackLabel,
    imageClassName,
    imageOverlay,
  });

  return (
    <article
      className={`gv-visual-card group overflow-hidden ${TILE_PADDING_BY_DENSITY[density]} ${className}`.trim()}
    >
      {utility ? <div className="gv-visual-card-utility">{utility}</div> : null}

      <div className={CONTENT_STACK_BY_DENSITY[density]}>
        {imageHref ? <Link href={imageHref} prefetch={imagePrefetch}>{image}</Link> : image}

        <div className={BODY_STACK_BY_DENSITY[density]}>
          <div className="space-y-1.5">
            <div className={`${TITLE_TEXT_BY_DENSITY[density]} gv-hi-card-identity`}>{title}</div>
            {subtitle ? <div className={`${SUBTITLE_TEXT_BY_DENSITY[density]} gv-hi-metadata`}>{subtitle}</div> : null}
          </div>

          {badges ? <div className="flex flex-wrap gap-1.5">{badges}</div> : null}
          {meta ? <div className={`${META_TEXT_BY_DENSITY[density]} gv-hi-metadata`}>{meta}</div> : null}
          {summary ? <div className="space-y-2.5">{summary}</div> : null}
          {details ? <div className="pt-1">{details}</div> : null}
          {footer ? (
            <div className={`gv-hi-diagnostics border-t border-slate-100/60 ${FOOTER_TEXT_BY_DENSITY[density]}`}>{footer}</div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
