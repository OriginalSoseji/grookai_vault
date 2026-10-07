import type { ReactNode } from "react";
import PublicCardImage from "@/components/PublicCardImage";
import { VaultEvidenceDisclosure } from "@/components/vault/VaultCardPrimitives";

type VaultExactCopyHeroProps = {
  compact?: boolean;
  eyebrow: string;
  cardName: string;
  setName?: string | null;
  setCode?: string | null;
  number?: string | null;
  gvId?: string | null;
  gvviId: string;
  primaryImageUrl?: string | null;
  fallbackImageUrl?: string | null;
  fallbackImageUrls?: Array<string | null | undefined>;
  finishLabel?: string | null;
  conditionLabel?: string | null;
  isGraded: boolean;
  grader?: string | null;
  grade?: string | null;
  certNumber?: string | null;
  statusLabel: string;
  intentLabel: string;
  contextLabel?: ReactNode;
  featuredContent?: ReactNode;
  actions?: ReactNode;
  evidence?: ReactNode;
};

function getSetLine({
  setName,
  setCode,
  number,
}: Pick<VaultExactCopyHeroProps, "setName" | "setCode" | "number">) {
  return [setName || setCode, number && number !== "—" ? `#${number}` : null]
    .filter(Boolean)
    .join(" • ");
}

export default function VaultExactCopyHero({
  compact = false,
  eyebrow,
  cardName,
  setName,
  setCode,
  number,
  gvId,
  gvviId,
  primaryImageUrl,
  fallbackImageUrl,
  fallbackImageUrls = [],
  finishLabel,
  conditionLabel,
  isGraded,
  grader,
  grade,
  certNumber,
  statusLabel,
  intentLabel,
  contextLabel,
  featuredContent,
  actions,
  evidence,
}: VaultExactCopyHeroProps) {
  const setLine = getSetLine({ setName, setCode, number });
  const formatLabel = isGraded ? "Graded slab" : "Raw copy";
  const exactVersionLabel = isGraded
    ? [grader, grade].filter(Boolean).join(" ") || "Graded copy"
    : finishLabel?.trim() || "Finish not selected";
  const conditionOrCert = isGraded
    ? certNumber
      ? `Cert ${certNumber}`
      : "Certificate not recorded"
    : conditionLabel || "Condition not recorded";

  if (compact) return <section className="border-b border-slate-200 pb-5 dark:border-white/10" data-vault-exact-copy-hero>
    <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[90px_minmax(0,1fr)]">
      <PublicCardImage src={primaryImageUrl ?? undefined} fallbackSrc={fallbackImageUrl ?? undefined}
        fallbackSources={fallbackImageUrls} alt={cardName} loading="eager" decoding="async"
        imageClassName="aspect-[5/7] w-full object-contain"
        fallbackClassName="flex aspect-[5/7] items-center justify-center rounded-lg bg-slate-100 text-center text-xs text-slate-600"
        fallbackLabel="No image" />
      <div className="min-w-0 space-y-2"><p className="gv-eyebrow">{eyebrow}</p>
        <h1 className="break-words text-2xl font-semibold leading-tight text-slate-950 dark:text-white">{cardName}</h1>
        {setLine && <p className="text-sm text-slate-600 dark:text-slate-300">{setLine}</p>}
        {contextLabel && <div className="text-sm text-slate-600 dark:text-slate-300">{contextLabel}</div>}
      </div>
      {featuredContent && <div className="col-span-2">{featuredContent}</div>}
      <dl className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5 sm:grid-cols-4" aria-label="Exact copy details">
        {[["Version", exactVersionLabel], ["Condition", conditionOrCert], ["Format", formatLabel], ["Status", `${statusLabel} · ${intentLabel}`]].map(([label, value]) =>
          <div key={label} className="min-w-0"><dt className="text-xs text-slate-600 dark:text-slate-300">{label}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>)}
      </dl>
      {actions && <div className="col-span-2 flex flex-wrap gap-2">{actions}</div>}
      <div className="col-span-2"><VaultEvidenceDisclosure>{gvId && <p>Grookai card ID: {gvId}</p>}<p>Copy ID: {gvviId}</p>{evidence}</VaultEvidenceDisclosure></div>
    </div>
  </section>;

  return (
    <section className="border-b border-slate-200/80 pb-8 dark:border-white/[0.08] md:pb-10" data-vault-exact-copy-hero>
      <div className="grid gap-7 lg:grid-cols-[minmax(220px,320px)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <div className="mx-auto w-full max-w-[180px] sm:max-w-[280px] lg:max-w-[320px]">
          <div className="gv-image-stage p-3">
            <PublicCardImage
              src={primaryImageUrl ?? undefined}
              fallbackSrc={fallbackImageUrl ?? undefined}
              fallbackSources={fallbackImageUrls}
              alt={cardName}
              loading="eager"
              decoding="async"
              imageClassName="aspect-[5/7] w-full object-contain drop-shadow-[0_18px_34px_rgba(15,23,42,0.16)]"
              fallbackClassName="flex aspect-[5/7] w-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500 dark:bg-white/[0.04] dark:text-slate-400"
              fallbackLabel={cardName}
            />
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          <div className="space-y-3">
            <p className="gv-eyebrow">{eyebrow}</p>
            {setLine ? <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{setLine}</p> : null}
            <h1 className="gv-hi-card-identity text-[2.35rem] font-semibold leading-[1.04] text-slate-950 dark:text-white sm:text-[3rem]">
              {cardName}
            </h1>
            {contextLabel ? <div className="text-sm text-slate-600 dark:text-slate-300">{contextLabel}</div> : null}
          </div>

          {featuredContent}

          <div className="grid grid-cols-2 border-y border-slate-200/80 py-3 dark:border-white/[0.08] lg:grid-cols-4" aria-label="Exact copy details">
            {[
              ["Version", exactVersionLabel],
              ["Condition", conditionOrCert],
              ["Format", formatLabel],
              ["Status", `${statusLabel} • ${intentLabel}`],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 border-b border-r border-slate-100 px-3 py-3 even:border-r-0 dark:border-white/[0.06] lg:border-b-0 lg:border-r lg:first:pl-0 lg:last:border-r-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">{label}</p>
                <p className="mt-1.5 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
              </div>
            ))}
          </div>

          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}

          <div className="pt-20 sm:pt-0">
            <VaultEvidenceDisclosure>
              {gvId ? <p>Grookai card ID: {gvId}</p> : null}
              <p>Exact copy ID: {gvviId}</p>
              {evidence}
            </VaultEvidenceDisclosure>
          </div>
        </div>
      </div>
    </section>
  );
}
