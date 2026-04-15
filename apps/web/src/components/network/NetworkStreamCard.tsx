import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import ContactOwnerButton from "@/components/network/ContactOwnerButton";
import { getVaultIntentLabel } from "@/lib/network/intent";
import type { CardStreamRow } from "@/lib/network/getCardStreamRows";
import { getVaultInstanceHref } from "@/lib/vault/getVaultInstanceHref";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";

type NetworkStreamCardProps = {
  row: CardStreamRow;
  isAuthenticated: boolean;
  viewerUserId: string | null;
  currentPath: string;
};

function getGroupedContactAnchor(row: CardStreamRow) {
  const copyVaultItemIds = Array.from(new Set(row.inPlayCopies.map((copy) => copy.vaultItemId)));
  if (copyVaultItemIds.length > 1) {
    return null;
  }

  return {
    vaultItemId: copyVaultItemIds[0] ?? row.vaultItemId,
    intent: row.intent,
  };
}

function getOwnershipSummary(row: CardStreamRow) {
  if (row.inPlayCount > 1) {
    return `${row.inPlayCount} copies in play`;
  }

  if (row.isGraded) {
    return (row.gradeLabel ?? [row.gradeCompany, row.gradeValue].filter(Boolean).join(" ")) || "Graded";
  }

  return row.conditionLabel ?? "Raw";
}

function getIntentSummary(row: CardStreamRow) {
  return [
    row.sellCount > 0 ? `${getVaultIntentLabel("sell")} ${row.sellCount}` : null,
    row.tradeCount > 0 ? `${getVaultIntentLabel("trade")} ${row.tradeCount}` : null,
    row.showcaseCount > 0 ? `${getVaultIntentLabel("showcase")} ${row.showcaseCount}` : null,
  ].filter((value): value is string => Boolean(value));
}

export function NetworkStreamCard({ row, isAuthenticated, viewerUserId, currentPath }: NetworkStreamCardProps) {
  const displayIdentity = resolveDisplayIdentity({
    name: row.name,
    variant_key: row.variantKey,
    printed_identity_modifier: row.printedIdentityModifier,
    set_identity_model: row.setIdentityModel,
    set_code: row.setCode,
    number: row.number === "—" ? null : row.number,
  });
  const loginHref = `/login?next=${encodeURIComponent(currentPath)}`;
  const ownerHref = `/u/${row.ownerSlug}`;
  const canContactOwner = viewerUserId !== row.ownerUserId;
  const intentSummary = getIntentSummary(row);
  const groupedContactAnchor = getGroupedContactAnchor(row);
  const singleCopyHref =
    row.inPlayCopies.length === 1 && row.inPlayCopies[0]?.gvviId
      ? getVaultInstanceHref(row.inPlayCopies[0].gvviId, viewerUserId, row.ownerUserId) ?? `/card/${row.gvId}`
      : `/card/${row.gvId}`;

  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-5 sm:flex-row">
        <Link
          href={singleCopyHref}
          className="flex w-full justify-center sm:w-[140px] sm:shrink-0"
        >
          <PublicCardImage
            src={row.imageUrl ?? undefined}
            alt={displayIdentity.display_name}
            imageClassName="aspect-[3/4] w-[140px] rounded-[1rem] border border-slate-200 bg-slate-50 object-contain p-2"
            fallbackClassName="flex aspect-[3/4] w-[140px] items-center justify-center rounded-[1rem] border border-slate-200 bg-slate-100 px-3 text-center text-xs text-slate-500"
            fallbackLabel={displayIdentity.display_name}
          />
        </Link>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {intentSummary.map((label) => (
              <span
                key={`${row.vaultItemId}-${label}`}
                className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700"
              >
                {label}
              </span>
            ))}
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              {getOwnershipSummary(row)}
            </span>
          </div>

          <div className="space-y-2">
            <Link href={singleCopyHref} className="block">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 transition hover:text-slate-700">
                {displayIdentity.display_name}
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
            {canContactOwner && groupedContactAnchor ? (
              <ContactOwnerButton
                vaultItemId={groupedContactAnchor.vaultItemId}
                cardPrintId={row.cardPrintId}
                ownerUserId={row.ownerUserId}
                viewerUserId={viewerUserId}
                ownerDisplayName={row.ownerDisplayName}
                cardName={displayIdentity.display_name}
                intent={groupedContactAnchor.intent}
                buttonLabel={groupedContactAnchor.intent ? undefined : "Contact owner"}
                isAuthenticated={isAuthenticated}
                loginHref={loginHref}
                currentPath={currentPath}
              />
            ) : null}
          </div>
          {row.inPlayCopies.length > 1 ? (
            <details className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-800">
                View copies ({row.inPlayCopies.length})
              </summary>
              <div className="mt-3 space-y-2">
                {row.inPlayCopies.map((copy) => (
                  <div key={copy.instanceId} className="rounded-[0.9rem] border border-slate-200 bg-white px-3 py-3">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                          {getVaultIntentLabel(copy.intent)}
                        </span>
                        {copy.isGraded ? (
                          <span>
                            {copy.gradeLabel ?? ([copy.gradeCompany, copy.gradeValue].filter(Boolean).join(" ") || "Graded")}
                          </span>
                        ) : copy.conditionLabel ? (
                          <span>{copy.conditionLabel}</span>
                        ) : null}
                        {copy.certNumber ? <span>Cert {copy.certNumber}</span> : null}
                      </div>
                      {copy.gvviId ? (
                        <Link
                          href={getVaultInstanceHref(copy.gvviId, viewerUserId, row.ownerUserId) ?? `/card/${row.gvId}`}
                          className="inline-flex text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
                        >
                          Open copy
                        </Link>
                      ) : null}
                      {canContactOwner ? (
                        <ContactOwnerButton
                          vaultItemId={copy.vaultItemId}
                          cardPrintId={row.cardPrintId}
                          ownerUserId={row.ownerUserId}
                          viewerUserId={viewerUserId}
                          ownerDisplayName={row.ownerDisplayName}
                          cardName={displayIdentity.display_name}
                          intent={copy.intent}
                          buttonLabel={row.inPlayCopies.length > 1 ? "Contact about this copy" : undefined}
                          isAuthenticated={isAuthenticated}
                          loginHref={loginHref}
                          currentPath={currentPath}
                          buttonClassName="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
          {canContactOwner && !groupedContactAnchor && row.inPlayCopies.length > 1 ? (
            <p className="text-xs text-slate-500">
              Choose a copy above to contact this collector about the exact card in play.
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default NetworkStreamCard;
