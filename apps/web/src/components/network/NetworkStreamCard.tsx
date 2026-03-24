import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import ContactOwnerButton from "@/components/network/ContactOwnerButton";
import { getVaultIntentLabel } from "@/lib/network/intent";
import type { CardStreamRow } from "@/lib/network/getCardStreamRows";

type NetworkStreamCardProps = {
  row: CardStreamRow;
  isAuthenticated: boolean;
  viewerUserId: string | null;
  currentPath: string;
};

function getOwnershipSummary(row: CardStreamRow) {
  if (row.isGraded) {
    return (row.gradeLabel ?? [row.gradeCompany, row.gradeValue].filter(Boolean).join(" ")) || "Graded";
  }

  if (row.quantity > 1) {
    return `${row.quantity} copies`;
  }

  return row.conditionLabel ?? "Raw";
}

export function NetworkStreamCard({ row, isAuthenticated, viewerUserId, currentPath }: NetworkStreamCardProps) {
  const loginHref = `/login?next=${encodeURIComponent(currentPath)}`;
  const ownerHref = `/u/${row.ownerSlug}`;
  const canContactOwner = viewerUserId !== row.ownerUserId;

  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-5 sm:flex-row">
        <Link
          href={`/card/${row.gvId}`}
          className="flex w-full justify-center sm:w-[140px] sm:shrink-0"
        >
          <PublicCardImage
            src={row.imageUrl ?? undefined}
            alt={row.name}
            imageClassName="aspect-[3/4] w-[140px] rounded-[1rem] border border-slate-200 bg-slate-50 object-contain p-2"
            fallbackClassName="flex aspect-[3/4] w-[140px] items-center justify-center rounded-[1rem] border border-slate-200 bg-slate-100 px-3 text-center text-xs text-slate-500"
            fallbackLabel={row.name}
          />
        </Link>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {getVaultIntentLabel(row.intent)}
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              {getOwnershipSummary(row)}
            </span>
          </div>

          <div className="space-y-2">
            <Link href={`/card/${row.gvId}`} className="block">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 transition hover:text-slate-700">
                {row.name}
              </h2>
            </Link>
            <p className="text-sm text-slate-600">
              {[row.setName || row.setCode, row.number !== "—" ? `#${row.number}` : undefined].filter(Boolean).join(" • ")}
            </p>
            <p className="text-sm text-slate-600">
              Collector{" "}
              <Link href={ownerHref} className="font-medium text-slate-900 underline-offset-4 hover:underline">
                {row.ownerDisplayName}
              </Link>
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              <p>{row.gvId}</p>
              <p>{row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently listed"}</p>
            </div>
            {canContactOwner ? (
              <ContactOwnerButton
                vaultItemId={row.vaultItemId}
                cardPrintId={row.cardPrintId}
                ownerUserId={row.ownerUserId}
                viewerUserId={viewerUserId}
                ownerDisplayName={row.ownerDisplayName}
                cardName={row.name}
                intent={row.intent}
                isAuthenticated={isAuthenticated}
                loginHref={loginHref}
                currentPath={currentPath}
              />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default NetworkStreamCard;
