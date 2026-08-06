import type { ReactNode } from "react";
import PublicCardImage from "@/components/PublicCardImage";
import { VaultEvidenceDisclosure } from "@/components/vault/VaultCardPrimitives";

type VaultExactCopyHeroProps = {
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
