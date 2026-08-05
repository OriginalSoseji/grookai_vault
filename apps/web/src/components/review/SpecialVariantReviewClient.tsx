"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  SPECIAL_VARIANT_FIRST_PASS_VERSION,
  SPECIAL_VARIANT_FOUNDER_VERSION,
  firstPassDecisions,
  founderDecisions,
  isFirstPassDecision,
  type FirstPassDecision,
  type FirstPassDecisionArtifact,
  type FirstPassDecisionRow,
  type FounderDecision,
  type FounderDecisionArtifact,
  type FounderDecisionRow,
  type SpecialVariantEvidenceRow,
  type SpecialVariantReviewManifest,
} from "@/lib/review/specialVariantReviewTypes";

type ReviewDraft = {
  firstPassDecision?: FirstPassDecision;
  founderDecision?: FounderDecision;
  publicationAuthorized: boolean;
  pricingAuthorized: boolean;
  notes: string;
  decidedAt?: string;
};

type ReviewDraftMap = Record<string, ReviewDraft>;

const decisionLabels: Record<FirstPassDecision | FounderDecision, string> = {
  exact_match: "Exact card and variant",
  needs_more_evidence: "Needs more evidence",
  wrong_card_identity: "Wrong card identity",
  wrong_variant_marker: "Wrong variant marker",
  wrong_finish: "Wrong finish",
  image_unusable: "Image unusable",
  confirmed: "Confirmed",
  rejected: "Rejected",
};

function emptyDraft(): ReviewDraft {
  return {
    publicationAuthorized: false,
    pricingAuthorized: false,
    notes: "",
  };
}

function imageUrl(row: SpecialVariantEvidenceRow) {
  return `/api/review/special-variants/image/${encodeURIComponent(row.card_printing_id)}`;
}

function ReviewEvidenceImage({
  row,
  alt,
  imageClassName,
  fallbackClassName,
  sizes,
}: {
  row: SpecialVariantEvidenceRow;
  alt: string;
  imageClassName: string;
  fallbackClassName: string;
  sizes: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [row.card_printing_id, row.source_image.sha256]);

  if (failed) {
    return <div className={fallbackClassName}>Image unavailable</div>;
  }

  return (
    <Image
      src={imageUrl(row)}
      alt={alt}
      className={imageClassName}
      width={row.source_image.width}
      height={row.source_image.height}
      sizes={sizes}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}

function downloadJson(fileName: string, value: unknown) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function sha256Text(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function shortHash(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function validateFirstPassArtifact(
  value: unknown,
  manifest: SpecialVariantReviewManifest,
): FirstPassDecisionArtifact {
  const artifact = value as Partial<FirstPassDecisionArtifact>;
  if (artifact.version !== SPECIAL_VARIANT_FIRST_PASS_VERSION) throw new Error("Wrong first-pass artifact version.");
  if (artifact.packet_fingerprint !== manifest.packet_fingerprint) throw new Error("Packet fingerprint does not match.");
  if (artifact.reviewer !== "PokeJavi" && artifact.reviewer !== "founder") {
    throw new Error("First-pass reviewer must be PokeJavi or the founder.");
  }
  if (!Array.isArray(artifact.decisions)) throw new Error("Decisions are missing.");
  if (artifact.decision_count !== artifact.decisions.length) throw new Error("Decision count does not reconcile.");
  if (artifact.decisions.length + Number(artifact.remaining_count) !== manifest.rows.length) {
    throw new Error("Decision and remaining counts do not reconcile.");
  }

  const rowByEvidence = new Map(manifest.rows.map((row) => [row.evidence_id, row]));
  const seen = new Set<string>();
  for (const decision of artifact.decisions) {
    const row = rowByEvidence.get(decision.evidence_id);
    if (!row || seen.has(decision.evidence_id)) throw new Error("Artifact contains an unknown or duplicate evidence row.");
    if (decision.card_printing_id !== row.card_printing_id || decision.source_image_sha256 !== row.source_image.sha256) {
      throw new Error(`Evidence binding mismatch for ${row.name}.`);
    }
    if (!isFirstPassDecision(decision.decision)) throw new Error(`Invalid first-pass decision for ${row.name}.`);
    seen.add(decision.evidence_id);
  }
  return artifact as FirstPassDecisionArtifact;
}

export default function SpecialVariantReviewClient({
  manifest,
  reviewerKey,
}: {
  manifest: SpecialVariantReviewManifest;
  reviewerKey: string;
}) {
  const isFounder = reviewerKey === "founder";
  const storageKey = `grookai-special-variant-review:${manifest.packet_fingerprint}:${reviewerKey}`;
  const [drafts, setDrafts] = useState<ReviewDraftMap>({});
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [flagFilter, setFlagFilter] = useState("all");
  const [activeEvidence, setActiveEvidence] = useState<SpecialVariantEvidenceRow | null>(null);
  const [firstPassArtifact, setFirstPassArtifact] = useState<FirstPassDecisionArtifact | null>(null);
  const [firstPassSha256, setFirstPassSha256] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) setDrafts(JSON.parse(stored) as ReviewDraftMap);
    } catch {
      setNotice("The saved browser draft could not be loaded.");
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(drafts));
  }, [drafts, hydrated, storageKey]);

  useEffect(() => {
    if (!activeEvidence) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveEvidence(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeEvidence]);

  const isFounderConfirmation = isFounder && firstPassArtifact !== null;

  const firstPassByEvidence = useMemo(
    () => new Map(firstPassArtifact?.decisions.map((row) => [row.evidence_id, row]) ?? []),
    [firstPassArtifact],
  );

  const reviewedCount = manifest.rows.filter((row) => {
    const draft = drafts[row.evidence_id];
    return isFounderConfirmation ? Boolean(draft?.founderDecision) : Boolean(draft?.firstPassDecision);
  }).length;
  const remainingCount = manifest.rows.length - reviewedCount;

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return manifest.rows.filter((row) => {
      const draft = drafts[row.evidence_id];
      const selectedDecision = isFounderConfirmation ? draft?.founderDecision : draft?.firstPassDecision;
      const matchesQuery =
        !normalizedQuery ||
        [row.name, row.number, row.set_code, row.variant_key, row.finish_key, row.printing_gv_id, String(row.source_product_id)]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesDecision =
        decisionFilter === "all" ||
        (decisionFilter === "unreviewed" ? !selectedDecision : selectedDecision === decisionFilter);
      const matchesFlag =
        flagFilter === "all" ||
        (flagFilter === "flagged" ? row.review_flags.length > 0 : row.review_flags.includes(flagFilter));
      return matchesQuery && matchesDecision && matchesFlag;
    });
  }, [decisionFilter, drafts, flagFilter, isFounderConfirmation, manifest.rows, query]);

  const allFlags = useMemo(
    () => Array.from(new Set(manifest.rows.flatMap((row) => row.review_flags))).sort(),
    [manifest.rows],
  );

  function updateDraft(evidenceId: string, update: Partial<ReviewDraft>) {
    setDrafts((current) => {
      const next = { ...(current[evidenceId] ?? emptyDraft()), ...update, decidedAt: new Date().toISOString() };
      if (next.founderDecision !== "confirmed") {
        next.publicationAuthorized = false;
        next.pricingAuthorized = false;
      }
      if (!next.publicationAuthorized) next.pricingAuthorized = false;
      return { ...current, [evidenceId]: next };
    });
  }

  async function exportFirstPass() {
    const decisions: FirstPassDecisionRow[] = manifest.rows.flatMap((row) => {
      const draft = drafts[row.evidence_id];
      if (!draft?.firstPassDecision) return [];
      return [{
        evidence_id: row.evidence_id,
        card_printing_id: row.card_printing_id,
        source_image_sha256: row.source_image.sha256,
        decision: draft.firstPassDecision,
        notes: draft.notes.trim(),
        decided_at: draft.decidedAt ?? new Date().toISOString(),
      }];
    });
    const artifact: FirstPassDecisionArtifact = {
      version: SPECIAL_VARIANT_FIRST_PASS_VERSION,
      packet_fingerprint: manifest.packet_fingerprint,
      reviewer: reviewerKey,
      exported_at: new Date().toISOString(),
      decision_count: decisions.length,
      remaining_count: manifest.rows.length - decisions.length,
      server_writes_performed: false,
      decisions,
    };
    downloadJson(`special_variant_first_pass_${reviewerKey}_${decisions.length}_of_${manifest.rows.length}.json`, artifact);
    if (isFounder && decisions.length === manifest.rows.length) {
      const serialized = `${JSON.stringify(artifact, null, 2)}\n`;
      setFirstPassArtifact(artifact);
      setFirstPassSha256(await sha256Text(serialized));
      setDecisionFilter("all");
      setNotice(`Exported all ${decisions.length} direct first-pass decisions and unlocked founder confirmation. No server data changed.`);
      return;
    }
    setNotice(`Exported ${decisions.length} first-pass decisions. Complete all ${manifest.rows.length} rows to unlock founder confirmation. No server data changed.`);
  }

  async function importFirstPass(file: File) {
    try {
      const text = await file.text();
      const artifact = validateFirstPassArtifact(JSON.parse(text), manifest);
      setFirstPassArtifact(artifact);
      setFirstPassSha256(await sha256Text(text));
      setDecisionFilter("all");
      setNotice(`Imported ${artifact.decision_count} image-bound decisions from ${artifact.reviewer}.`);
    } catch (error) {
      setFirstPassArtifact(null);
      setFirstPassSha256(null);
      setNotice(error instanceof Error ? error.message : "First-pass import failed.");
    }
  }

  function exportFounder() {
    if (!firstPassArtifact || !firstPassSha256) {
      setNotice("Complete and export a direct first pass, or import an image-bound first-pass artifact, before exporting founder decisions.");
      return;
    }
    const decisions: FounderDecisionRow[] = manifest.rows.flatMap((row) => {
      const firstPass = firstPassByEvidence.get(row.evidence_id);
      const draft = drafts[row.evidence_id];
      if (!firstPass || !draft?.founderDecision) return [];
      return [{
        evidence_id: row.evidence_id,
        card_printing_id: row.card_printing_id,
        source_image_sha256: row.source_image.sha256,
        first_pass_decision: firstPass.decision,
        first_pass_decided_at: firstPass.decided_at,
        founder_decision: draft.founderDecision,
        publication_authorized: draft.publicationAuthorized,
        pricing_authorized: draft.pricingAuthorized,
        notes: draft.notes.trim(),
        decided_at: draft.decidedAt ?? new Date().toISOString(),
      }];
    });
    const artifact: FounderDecisionArtifact = {
      version: SPECIAL_VARIANT_FOUNDER_VERSION,
      packet_fingerprint: manifest.packet_fingerprint,
      source_first_pass_sha256: firstPassSha256,
      source_first_pass_reviewer: firstPassArtifact.reviewer,
      reviewer: "founder",
      exported_at: new Date().toISOString(),
      decision_count: decisions.length,
      remaining_count: manifest.rows.length - decisions.length,
      server_writes_performed: false,
      decisions,
    };
    downloadJson(`special_variant_founder_${decisions.length}_of_${manifest.rows.length}.json`, artifact);
    setNotice(`Exported ${decisions.length} founder decisions. No server data changed.`);
  }

  function clearDrafts() {
    if (!window.confirm("Clear this browser's saved decisions for the current packet?")) return;
    setDrafts({});
    window.localStorage.removeItem(storageKey);
    setNotice("Local draft cleared. No server data changed.");
  }

  function goToNextUnreviewed() {
    const next = manifest.rows.find((row) => {
      const draft = drafts[row.evidence_id];
      return isFounderConfirmation ? !draft?.founderDecision : !draft?.firstPassDecision;
    });
    if (!next) {
      setNotice("Every row in this packet has a decision.");
      return;
    }
    document.getElementById(`review-${next.card_printing_id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-6 pb-14 pt-6">
      <header className="border-b border-slate-200/80 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">Private evidence review</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-950">Special variant printings</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Confirm the exact card, marker, and finish shown by each self-hosted image. Drafts stay in this browser until exported.
            </p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <p className="font-semibold text-slate-950">{reviewedCount} / {manifest.rows.length} reviewed</p>
            <p>{remainingCount} remaining</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded bg-slate-200" aria-label={`${reviewedCount} of ${manifest.rows.length} reviewed`}>
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${(reviewedCount / manifest.rows.length) * 100}%` }} />
        </div>
      </header>

      {isFounder ? (
        <section className="border-y border-slate-200 bg-white/60 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                {isFounderConfirmation ? "Founder confirmation" : "Direct founder first pass"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {isFounderConfirmation
                  ? `Confirm the evidence-bound first pass from ${firstPassArtifact?.reviewer}. Reviewing still performs no server writes.`
                  : "Classify every image directly. Exporting a complete first pass unlocks final confirmation without relying on another reviewer."}
              </p>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importFirstPass(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
            >
              Import first-pass JSON
            </button>
          </div>
          {isFounderConfirmation && firstPassArtifact ? (
            <p className="mt-3 text-xs text-emerald-700">
              Loaded {firstPassArtifact.decision_count} decisions from {firstPassArtifact.reviewer}. Artifact {shortHash(firstPassSha256 ?? "")}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="sticky top-0 z-20 border-y border-slate-200 bg-slate-50/95 py-3 backdrop-blur">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, set, number, GV-ID, or product ID"
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <select
            value={decisionFilter}
            onChange={(event) => setDecisionFilter(event.target.value)}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950"
          >
            <option value="all">All decisions</option>
            <option value="unreviewed">Unreviewed</option>
            {(isFounderConfirmation ? founderDecisions : firstPassDecisions).map((decision) => (
              <option key={decision} value={decision}>{decisionLabels[decision]}</option>
            ))}
          </select>
          <select
            value={flagFilter}
            onChange={(event) => setFlagFilter(event.target.value)}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950"
          >
            <option value="all">All evidence</option>
            <option value="flagged">Any review flag</option>
            {allFlags.map((flag) => <option key={flag} value={flag}>{formatLabel(flag)}</option>)}
          </select>
          <button
            type="button"
            onClick={goToNextUnreviewed}
            className="min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Next unreviewed
          </button>
        </div>
      </section>

      {notice ? (
        <div role="status" className="border-l-4 border-blue-500 bg-blue-50 px-4 py-3 text-sm text-blue-950">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleRows.map((row) => {
          const draft = drafts[row.evidence_id] ?? emptyDraft();
          const firstPass = firstPassByEvidence.get(row.evidence_id);
          const founderDisabled = isFounderConfirmation && !firstPass;
          return (
            <article
              id={`review-${row.card_printing_id}`}
              key={row.evidence_id}
              className="scroll-mt-28 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => setActiveEvidence(row)}
                className="block w-full cursor-zoom-in bg-slate-100 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label={`Open evidence for ${row.name} ${row.variant_key}`}
              >
                <ReviewEvidenceImage
                  row={row}
                  alt={`${row.name} ${formatLabel(row.variant_key)} ${formatLabel(row.finish_key)}`}
                  imageClassName="aspect-[3/4] h-auto w-full object-contain"
                  fallbackClassName="flex aspect-[3/4] items-center justify-center px-4 text-center text-sm text-slate-500"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </button>
              <div className="space-y-4 p-4">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold text-slate-950">{row.name}</h2>
                    <span className="shrink-0 text-xs font-semibold text-blue-700">#{row.number}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{row.set_code} · {formatLabel(row.variant_key)} · {formatLabel(row.finish_key)}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">{row.printing_gv_id}</p>
                </div>

                {row.review_flags.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {row.review_flags.map((flag) => (
                      <span key={flag} className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900">
                        {formatLabel(flag)}
                      </span>
                    ))}
                  </div>
                ) : null}

                {isFounderConfirmation ? (
                  <div className="border-l-2 border-slate-200 pl-3 text-xs text-slate-600">
                    {firstPass ? (
                      <>
                        <p className="font-semibold text-slate-900">{firstPassArtifact?.reviewer}: {decisionLabels[firstPass.decision]}</p>
                        {firstPass.notes ? <p className="mt-1 leading-5">{firstPass.notes}</p> : null}
                      </>
                    ) : (
                      <p>No imported first-pass decision for this row.</p>
                    )}
                  </div>
                ) : null}

                <label className="block text-xs font-semibold text-slate-700">
                  Decision
                  <select
                    value={isFounderConfirmation ? draft.founderDecision ?? "" : draft.firstPassDecision ?? ""}
                    disabled={founderDisabled}
                    onChange={(event) => {
                      if (isFounderConfirmation) updateDraft(row.evidence_id, { founderDecision: event.target.value as FounderDecision });
                      else updateDraft(row.evidence_id, { firstPassDecision: event.target.value as FirstPassDecision });
                    }}
                    className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">Select decision</option>
                    {(isFounderConfirmation ? founderDecisions : firstPassDecisions).map((decision) => (
                      <option key={decision} value={decision}>{decisionLabels[decision]}</option>
                    ))}
                  </select>
                </label>

                {isFounderConfirmation ? (
                  <div className="space-y-2 text-sm text-slate-700">
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={draft.publicationAuthorized}
                        disabled={draft.founderDecision !== "confirmed"}
                        onChange={(event) => updateDraft(row.evidence_id, { publicationAuthorized: event.target.checked })}
                        className="mt-0.5 h-4 w-4"
                      />
                      <span>Authorize later public-visibility gate</span>
                    </label>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={draft.pricingAuthorized}
                        disabled={draft.founderDecision !== "confirmed" || !draft.publicationAuthorized}
                        onChange={(event) => updateDraft(row.evidence_id, { pricingAuthorized: event.target.checked })}
                        className="mt-0.5 h-4 w-4"
                      />
                      <span>Authorize later exact-pricing gate</span>
                    </label>
                  </div>
                ) : null}

                <label className="block text-xs font-semibold text-slate-700">
                  Evidence note
                  <textarea
                    value={draft.notes}
                    disabled={founderDisabled}
                    onChange={(event) => updateDraft(row.evidence_id, { notes: event.target.value })}
                    rows={3}
                    className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal leading-5 text-slate-950 disabled:bg-slate-100"
                    placeholder="Record the visible marker, mismatch, or uncertainty."
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setActiveEvidence(row)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  View full evidence
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {visibleRows.length === 0 ? (
        <div className="border-y border-slate-200 py-12 text-center text-sm text-slate-600">No rows match the current filters.</div>
      ) : null}

      <section className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
        <div className="text-xs leading-5 text-slate-500">
          <p>Packet {shortHash(manifest.packet_fingerprint)}</p>
          <p>Private self-hosted images · no server or database writes from this page</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={clearDrafts} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">
            Clear local draft
          </button>
          <button
            type="button"
            onClick={isFounderConfirmation ? exportFounder : () => void exportFirstPass()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Export {isFounderConfirmation ? "founder" : isFounder ? "direct first-pass" : "first-pass"} JSON
          </button>
        </div>
      </section>

      {activeEvidence ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Evidence for ${activeEvidence.name}`}
          className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/92 p-4 backdrop-blur-sm sm:p-6"
          onClick={() => setActiveEvidence(null)}
        >
          <div className="mx-auto grid min-h-full max-w-6xl items-center gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]" onClick={(event) => event.stopPropagation()}>
            <div className="flex min-h-[60vh] items-center justify-center">
              <ReviewEvidenceImage
                row={activeEvidence}
                alt={`${activeEvidence.name} exact printing evidence`}
                imageClassName="block h-auto max-h-[90vh] w-auto max-w-full rounded-lg bg-white object-contain shadow-2xl"
                fallbackClassName="flex min-h-[60vh] w-full items-center justify-center rounded-lg bg-white px-6 text-center text-sm text-slate-500"
                sizes="75vw"
              />
            </div>
            <aside className="rounded-lg bg-white p-5 text-slate-950 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{activeEvidence.name} #{activeEvidence.number}</h2>
                  <p className="mt-1 text-sm text-slate-600">{activeEvidence.set_code} · {formatLabel(activeEvidence.variant_key)} · {formatLabel(activeEvidence.finish_key)}</p>
                </div>
                <button type="button" onClick={() => setActiveEvidence(null)} className="h-10 w-10 text-3xl leading-none text-slate-500 hover:text-slate-950" aria-label="Close evidence">
                  &times;
                </button>
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <div><dt className="font-semibold text-slate-500">Expected identity</dt><dd className="mt-1 break-all">{activeEvidence.printing_gv_id}</dd></div>
                <div><dt className="font-semibold text-slate-500">Source product</dt><dd className="mt-1">{activeEvidence.source_product_title} ({activeEvidence.source_product_id})</dd></div>
                <div><dt className="font-semibold text-slate-500">Image</dt><dd className="mt-1">{activeEvidence.source_image.width} × {activeEvidence.source_image.height} · {Math.round(activeEvidence.source_image.size_bytes / 1024)} KB</dd></div>
                <div><dt className="font-semibold text-slate-500">SHA-256</dt><dd className="mt-1 break-all font-mono text-xs">{activeEvidence.source_image.sha256}</dd></div>
                <div><dt className="font-semibold text-slate-500">Evidence role</dt><dd className="mt-1">{formatLabel(activeEvidence.claim_role)}</dd></div>
                <div><dt className="font-semibold text-slate-500">Source provenance</dt><dd className="mt-1"><a href={activeEvidence.source_page_url} target="_blank" rel="noreferrer" className="text-blue-700 underline underline-offset-2">Open product page</a></dd></div>
              </dl>
              <p className="mt-5 border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
                This is candidate evidence. Seeing an exact image does not approve the row, publish it, or map pricing.
              </p>
            </aside>
          </div>
        </div>
      ) : null}
    </div>
  );
}
