import PublicCardImage from "@/components/PublicCardImage";

/** The selected card stays visible while the collector completes one task. */
export default function CollectorCardContext({ name, context, imageUrl }: {
  name: string;
  context?: string;
  imageUrl?: string | null;
}) {
  return (
    <div className="gv-collector-context">
      <PublicCardImage
        src={imageUrl ?? undefined}
        alt=""
        imageClassName="gv-collector-thumb"
        fallbackClassName="gv-collector-thumb gv-collector-thumb-empty"
        fallbackLabel=""
        sizes="64px"
        unoptimized
      />
      <div className="min-w-0">
        <p className="text-base font-semibold">{name}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--gv-text-secondary)]">
          {context}
        </p>
      </div>
    </div>
  );
}
