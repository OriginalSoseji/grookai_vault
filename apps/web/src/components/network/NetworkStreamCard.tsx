import Link from "next/link";
import { ExternalLink, Info, MessageCircle } from "lucide-react";
import CardImageTruthBadge from "@/components/cards/CardImageTruthBadge";
import {
  CollectorCardFacts,
  CollectorEvidenceDisclosure,
} from "@/components/collector/CollectorCardPresentation";
import PublicCardImage from "@/components/PublicCardImage";
import ContactOwnerButton from "@/components/network/ContactOwnerButton";
import { resolveCardImagePresentation } from "@/lib/cards/resolveCardImagePresentation";
import { getVaultIntentLabel } from "@/lib/network/intent";
import type { CardStreamRow } from "@/lib/network/getCardStreamRows";
import { getVaultInstanceHref } from "@/lib/vault/getVaultInstanceHref";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { addCardReturnPath } from "@/lib/navigation/cardDetailNavigation";

type NetworkStreamCardProps = {
  row: CardStreamRow;
  isAuthenticated: boolean;
  viewerUserId: string | null;
  currentPath: string;
};

const NETWORK_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function getGroupedContactAnchor(row: CardStreamRow) {
  if (row.inPlayCopies.length !== 1) {
    return null;
  }

  const copy = row.inPlayCopies[0];
  return {
    vaultItemInstanceId: copy.instanceId,
    vaultItemId: copy.vaultItemId,
    intent: copy.intent,
  };
}

function getCopyPrintingLabel(copy: CardStreamRow["inPlayCopies"][number]) {
  if (!copy.cardPrintingId) {
    return "Printing not recorded";
  }

  return `Printing: ${copy.finishLabel ?? copy.printingGvId ?? "Exact printing"}`;
}

function getOwnershipSummary(row: CardStreamRow) {
  if (row.inPlayCount > 1) {
    return `${row.inPlayCount} copies visible`;
  }

  if (row.isGraded) {
    return (
      (row.gradeLabel ??
        [row.gradeCompany, row.gradeValue].filter(Boolean).join(" ")) ||
      "Graded"
    );
  }

  return row.conditionLabel ?? "Raw";
}

function getIntentSummary(row: CardStreamRow) {
  return [
    row.sellCount > 0
      ? `${getVaultIntentLabel("sell")} ${row.sellCount}`
      : null,
    row.tradeCount > 0
      ? `${getVaultIntentLabel("trade")} ${row.tradeCount}`
      : null,
    row.showcaseCount > 0
      ? `${getVaultIntentLabel("showcase")} ${row.showcaseCount}`
      : null,
  ].filter((value): value is string => Boolean(value));
}

function getCollectorInitials(value: string) {
  const initials = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join("");

  return initials || "GV";
}

function getActivityLabel(row: CardStreamRow) {
  if (row.inPlayCount > 1) {
    return `made ${row.inPlayCount} copies available`;
  }

  if (row.intent) {
    const intentPhrase =
      row.intent === "sell"
        ? "for sale"
        : row.intent === "trade"
          ? "for trade"
          : "for showcase";
    return `marked a copy ${intentPhrase}`;
  }

  return "shared a card";
}

export function NetworkStreamCard({
  row,
  isAuthenticated,
  viewerUserId,
  currentPath,
}: NetworkStreamCardProps) {
  const displayIdentity = resolveDisplayIdentity({
    name: row.name,
    variant_key: row.variantKey,
    printed_identity_modifier: row.printedIdentityModifier,
    set_identity_model: row.setIdentityModel,
    set_code: row.setCode,
    number: row.number === "—" ? null : row.number,
  });
  const imagePresentation = resolveCardImagePresentation({
    display_image_kind: row.displayImageKind,
    image_status: row.imageStatus,
    image_note: row.imageNote,
  });
  const loginHref = `/login?next=${encodeURIComponent(currentPath)}`;
  const ownerHref = `/u/${row.ownerSlug}`;
  const canContactOwner = viewerUserId !== row.ownerUserId;
  const intentSummary = getIntentSummary(row);
  const groupedContactAnchor = getGroupedContactAnchor(row);
  const singleCopy = row.inPlayCopies.length === 1 ? row.inPlayCopies[0] : null;
  const cardHref = addCardReturnPath(`/card/${encodeURIComponent(row.gvId)}`, currentPath);
  const singleCopyHref =
    row.inPlayCopies.length === 1 && row.inPlayCopies[0]?.gvviId
      ? (getVaultInstanceHref(
          row.inPlayCopies[0].gvviId,
          viewerUserId,
          row.ownerUserId,
        ) ?? cardHref)
      : cardHref;

  const freshnessLabel = row.createdAt
    ? NETWORK_DATE_FORMATTER.format(new Date(row.createdAt))
    : "Recently";

  return (
    <article
      className="gv-social-event gv-pulse-event border-b border-slate-200/80 py-7 first:pt-0 last:border-b-0 dark:border-white/[0.08]"
      data-pulse-event-card
    >
      <header className="mb-4 flex min-w-0 items-center gap-3">
        <Link
          href={ownerHref}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-slate-200 bg-slate-950 text-xs font-semibold text-white dark:border-white/[0.12]"
          aria-label={`View ${row.ownerDisplayName}'s profile`}
        >
          {getCollectorInitials(row.ownerDisplayName)}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <Link
              href={ownerHref}
              className="font-semibold text-slate-950 underline-offset-4 hover:underline dark:text-white"
            >
              {row.ownerDisplayName}
            </Link>{" "}
            {getActivityLabel(row)}
          </p>
          <time
            className="text-xs text-slate-500"
            dateTime={row.createdAt ?? undefined}
          >
            {freshnessLabel}
          </time>
        </div>
      </header>

      <div className="gv-network-event-body gv-pulse-event-body">
        <Link href={singleCopyHref} className="gv-network-event-image gv-pulse-art relative">
          <PublicCardImage
            src={row.imageUrl ?? undefined}
            fallbackSrc={row.imageFallbackUrls[0]}
            fallbackSources={row.imageFallbackUrls.slice(1)}
            alt={displayIdentity.display_name}
            imageClassName="aspect-[5/7] w-full rounded-[20px] bg-slate-50 object-contain"
            fallbackClassName="flex aspect-[5/7] w-full items-center justify-center rounded-[20px] bg-slate-100 px-3 text-center text-xs text-slate-500"
            fallbackLabel={displayIdentity.display_name}
          />
        </Link>

        <div className="gv-pulse-event-content min-w-0 space-y-4">
          <CollectorCardFacts
            title={
              <Link
                href={singleCopyHref}
                className="transition hover:text-slate-700"
              >
                {displayIdentity.base_name}
              </Link>
            }
            setName={row.setName || row.setCode}
            number={row.number}
            versionLabel={displayIdentity.suffix}
            ownershipLabel={getOwnershipSummary(row)}
            availabilityLabels={intentSummary}
          />
          {singleCopy ? (
            <p
              className="text-sm font-medium text-slate-800"
              data-card-printing-identity
            >
              {getCopyPrintingLabel(singleCopy)}
            </p>
          ) : null}
          {imagePresentation.compactBadgeLabel ? (
            <div className="w-fit">
              <CardImageTruthBadge
                label={imagePresentation.compactBadgeLabel}
                note={imagePresentation.detailNote}
                emphasis={
                  imagePresentation.isCollisionRepresentative
                    ? "strong"
                    : "default"
                }
              />
            </div>
          ) : null}

          <div className="gv-pulse-actions" aria-label="Card actions">
            <Link
              href={singleCopyHref}
              className="gv-pulse-action"
            >
              <ExternalLink size={17} aria-hidden="true" />
              <span>View card</span>
            </Link>
            {canContactOwner && groupedContactAnchor ? (
              <ContactOwnerButton
                vaultItemInstanceId={groupedContactAnchor.vaultItemInstanceId}
                vaultItemId={groupedContactAnchor.vaultItemId}
                cardPrintId={row.cardPrintId}
                ownerUserId={row.ownerUserId}
                viewerUserId={viewerUserId}
                ownerDisplayName={row.ownerDisplayName}
                cardName={displayIdentity.display_name}
                intent={groupedContactAnchor.intent}
                buttonLabel={
                  groupedContactAnchor.intent ? undefined : "Message collector"
                }
                isAuthenticated={isAuthenticated}
                loginHref={loginHref}
                currentPath={currentPath}
                buttonClassName="gv-pulse-action gv-pulse-message-action"
                buttonIcon={<MessageCircle size={17} aria-hidden="true" />}
              />
            ) : null}
          </div>
          {row.inPlayCopies.length > 1 ? (
            <details className="gv-pulse-details rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-800">
                <Info size={16} aria-hidden="true" />
                View copies ({row.inPlayCopies.length})
              </summary>
              <div className="mt-3 space-y-2">
                {row.inPlayCopies.map((copy) => (
                  <div
                    key={copy.instanceId}
                    className="rounded-[0.9rem] border border-slate-200 bg-white px-3 py-3"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                          {getVaultIntentLabel(copy.intent)}
                        </span>
                        {copy.isGraded ? (
                          <span>
                            {copy.gradeLabel ??
                              ([copy.gradeCompany, copy.gradeValue]
                                .filter(Boolean)
                                .join(" ") ||
                                "Graded")}
                          </span>
                        ) : copy.conditionLabel ? (
                          <span>{copy.conditionLabel}</span>
                        ) : null}
                        {copy.certNumber ? (
                          <span>Cert {copy.certNumber}</span>
                        ) : null}
                        <span data-card-printing-identity>
                          {getCopyPrintingLabel(copy)}
                        </span>
                      </div>
                      {copy.gvviId ? (
                        <Link
                          href={
                            getVaultInstanceHref(
                              copy.gvviId,
                              viewerUserId,
                              row.ownerUserId,
                            ) ?? cardHref
                          }
                          className="inline-flex text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
                        >
                          Open copy
                        </Link>
                      ) : null}
                      {canContactOwner ? (
                        <ContactOwnerButton
                          vaultItemInstanceId={copy.instanceId}
                          vaultItemId={copy.vaultItemId}
                          cardPrintId={row.cardPrintId}
                          ownerUserId={row.ownerUserId}
                          viewerUserId={viewerUserId}
                          ownerDisplayName={row.ownerDisplayName}
                          cardName={displayIdentity.display_name}
                          intent={copy.intent}
                          buttonLabel={
                            row.inPlayCopies.length > 1
                              ? "Message about this copy"
                              : undefined
                          }
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
          {canContactOwner &&
          !groupedContactAnchor &&
          row.inPlayCopies.length > 1 ? (
            <p className="text-xs text-slate-500">
              Choose a copy above to message this collector about that card.
            </p>
          ) : null}
          <CollectorEvidenceDisclosure label="Event evidence">
            <p>Card ID: {row.gvId}</p>
            <p>Activity recorded {freshnessLabel}</p>
            <p>
              {row.inPlayCount} visible{" "}
              {row.inPlayCount === 1 ? "copy" : "copies"}
            </p>
          </CollectorEvidenceDisclosure>
        </div>
      </div>
    </article>
  );
}

export default NetworkStreamCard;
