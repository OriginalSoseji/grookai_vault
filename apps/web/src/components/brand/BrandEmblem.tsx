import Image from "next/image";
import type { CSSProperties } from "react";

type EmblemStyle = CSSProperties & { "--gv-logo-fill"?: string };

/** Recolor the original artwork without tracing or changing its geometry. */
export function BrandEmblem({
  fill,
  size = 64,
  label = "grookai logo",
}: {
  /** A CSS color or gradient. Inherits --gv-logo-fill when omitted. */
  fill?: string;
  size?: number;
  /** Empty for a decorative emblem next to the text wordmark. */
  label?: string;
}) {
  const style: EmblemStyle = { width: size, height: size, "--gv-logo-fill": fill };

  return (
    <span
      className="gv-brand-emblem"
      style={style}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={!label || undefined}
      data-grookai-emblem
    >
      <Image
        src="/grookai-logo-64.png"
        alt=""
        width={size}
        height={size}
        loading="eager"
        className="gv-brand-emblem-source"
      />
    </span>
  );
}
