/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicCardImage from "@/components/PublicCardImage";
import WarehouseFounderActionPanel from "@/components/founder/WarehouseFounderActionPanel";
import WarehouseStagingExecutionPanel from "@/components/founder/WarehouseStagingExecutionPanel";
import {
  DefinitionGrid,
  JsonDisclosure,
  WarehouseBadge,
} from "@/components/founder/WarehouseReviewPrimitives";
import PageContainer from "@/components/layout/PageContainer";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import { requireFounderAccess } from "@/lib/founder/requireFounderAccess";
import type { FounderUnresolvedReview } from "@/lib/warehouse/buildFounderPromotionReview";
import type { PromotionWritePlanV1, WriteAction } from "@/lib/warehouse/buildPromotionWritePlanV1";
import type { WarehouseInterpreterPackage } from "@/lib/warehouse/buildWarehouseInterpreterV1";
import {
  getFounderWarehouseCandidateById,
  type FounderWarehouseEvidenceDetailRow,
} from "@/lib/warehouse/getFounderWarehouseCandidateById";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Founder Warehouse Candidate",
  robots: {
    index: false,
    follow: false,
  },
};

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderScalar(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "—";
  }
  return String(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function renderStructuredEntries(value: Record<string, unknown> | null) {
  if (!value) {
    return <p className="text-sm text-slate-500">No structured detail recorded yet.</p>;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">No structured detail recorded yet.</p>;
  }

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {entries.map(([key, entryValue]) => (
        <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{key}</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">
            {renderScalar(entryValue)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SupportingList({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: string[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={`${title}:${item}`} className="text-sm leading-6 text-slate-900">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BlockingIssuesPanel({ unresolved }: { unresolved: FounderUnresolvedReview }) {
  return (
    <section className="space-y-4 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-5">
      <div className="flex flex-wrap items-center gap-2">
        <WarehouseBadge value={unresolved.status} />
        <WarehouseBadge value={unresolved.blocking_reason_label} tone="default" />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">Blocking reason</p>
        <p className="text-sm leading-7 text-rose-950">{unresolved.founder_explanation}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SupportingList
          title="Missing for promotion"
          items={unresolved.missing_fields}
          emptyMessage="No specific missing fields were recorded."
        />
        <SupportingList
          title="Next actions"
          items={unresolved.next_actions}
          emptyMessage="No next actions were recorded."
        />
      </div>
      <JsonDisclosure label="Unresolved review JSON" value={unresolved} />
    </section>
  );
}

function InterpreterBlockingPanel({ interpreter }: { interpreter: WarehouseInterpreterPackage }) {
  return (
    <section className="space-y-4 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-5">
      <div className="flex flex-wrap items-center gap-2">
        <WarehouseBadge value={interpreter.status} />
        <WarehouseBadge value={interpreter.decision} />
        <WarehouseBadge value={interpreter.reason_code} tone="default" />
        <WarehouseBadge value={interpreter.confidence} tone="muted" />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">Blocking reason</p>
        <p className="text-sm leading-7 text-rose-950">{interpreter.founder_explanation}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SupportingList
          title="Missing for promotion"
          items={interpreter.missing_fields}
          emptyMessage="No specific missing fields were recorded."
        />
        <SupportingList
          title="Next actions"
          items={interpreter.next_actions}
          emptyMessage="No next actions were recorded."
        />
      </div>
      {interpreter.evidence_gaps.length > 0 ? (
        <SupportingList
          title="Evidence gaps"
          items={interpreter.evidence_gaps}
          emptyMessage="No evidence gaps were recorded."
        />
      ) : null}
      <JsonDisclosure label="Interpreter package JSON" value={interpreter} />
    </section>
  );
}

function PlanRowCard({
  domain,
  status,
  title,
  detail,
  target,
  fields,
}: {
  domain: string;
  status: string;
  title: string;
  detail: string;
  target: string | null;
  fields: Array<{ label: string; value: string | null }>;
}) {
  return (
    <article className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <WarehouseBadge value={status} />
        <WarehouseBadge value={domain} tone="default" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
        <p className="text-sm leading-6 text-slate-700">{detail}</p>
      </div>
      <DefinitionGrid
        items={[
          { label: "Target", value: target ?? "—" },
          ...fields.map((field) => ({
            label: field.label,
            value: field.value ?? "—",
          })),
        ]}
      />
    </article>
  );
}

function formatWritePlanDomain(domain: string) {
  switch (domain) {
    case "card_prints":
      return "card_prints";
    case "card_printings":
      return "card_printings";
    case "external_mappings":
      return "external_mappings";
    case "image_fields":
      return "image_fields";
    default:
      return domain;
  }
}

function formatWritePlanTitle(domain: string) {
  switch (domain) {
    case "card_prints":
      return "Card print";
    case "card_printings":
      return "Card printing";
    case "external_mappings":
      return "External mappings";
    case "image_fields":
      return "Image fields";
    default:
      return domain;
  }
}

function getPromotionWritePlanOutcomeLabel(plan: PromotionWritePlanV1 | null) {
  if (!plan || plan.status === "BLOCKED") {
    return null;
  }

  if (plan.actions.card_printings.action === "CREATE") {
    return "CARD_PRINTING_CREATED";
  }
  if (plan.actions.card_prints.action === "CREATE") {
    return "CARD_PRINT_CREATED";
  }
  if (plan.actions.image_fields.action === "UPDATE") {
    return "CANON_IMAGE_ENRICHED";
  }

  return "NO_OP";
}

function PromotionWriteActionCard({
  domain,
  action,
}: {
  domain: string;
  action: WriteAction;
}) {
  return (
    <article className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <WarehouseBadge value={action.action} />
        <WarehouseBadge value={formatWritePlanDomain(domain)} tone="default" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold tracking-tight text-slate-950">
          {formatWritePlanTitle(domain)}
        </h3>
        <p className="text-sm leading-6 text-slate-700">{action.reason ?? "No mutation would be planned."}</p>
      </div>
      <DefinitionGrid
        items={[
          { label: "Target", value: action.target_id ?? "—" },
          { label: "Action", value: action.action },
        ]}
      />
      <JsonDisclosure label={`${formatWritePlanTitle(domain)} payload`} value={action.payload} />
    </article>
  );
}

function EvidenceCard({ row }: { row: FounderWarehouseEvidenceDetailRow }) {
  return (
    <article className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <WarehouseBadge value={row.evidence_kind} tone="default" />
        <WarehouseBadge value={row.evidence_slot ?? "no-slot"} tone="muted" />
      </div>

      {row.previews.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {row.previews.map((preview) => (
            <a
              key={`${row.id}:${preview.url}`}
              href={preview.url}
              target="_blank"
              rel="noreferrer"
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
            >
              <img
                src={preview.url}
                alt={`${row.evidence_kind} preview`}
                className="aspect-[3/4] h-full w-full object-cover transition group-hover:scale-[1.01]"
              />
              <div className="border-t border-slate-200 px-3 py-2 text-xs text-slate-600">{preview.label}</div>
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          No safe preview URL is available for this evidence row. The reference path is still shown below.
        </div>
      )}

      <DefinitionGrid
        items={[
          { label: "Evidence id", value: row.id },
          { label: "Created", value: formatTimestamp(row.created_at) },
          { label: "Storage path", value: row.storage_path ?? "—" },
          { label: "Identity snapshot", value: row.identity_snapshot_id ?? "—" },
          { label: "Condition snapshot", value: row.condition_snapshot_id ?? "—" },
          { label: "Scan event", value: row.identity_scan_event_id ?? "—" },
        ]}
      />

      {(row.linked_identity_snapshot || row.linked_condition_snapshot || row.linked_scan_event || row.linked_scan_result) ? (
        <DefinitionGrid
          items={[
            {
              label: "Identity snapshot created",
              value: formatTimestamp(row.linked_identity_snapshot?.created_at),
            },
            {
              label: "Condition snapshot confidence",
              value:
                typeof row.linked_condition_snapshot?.confidence === "number"
                  ? row.linked_condition_snapshot.confidence.toFixed(2)
                  : "—",
            },
            {
              label: "Condition snapshot card print",
              value: row.linked_condition_snapshot?.card_print_id ?? "—",
            },
            {
              label: "Scan event status",
              value: row.linked_scan_event?.status ?? "—",
            },
            {
              label: "Latest scan result status",
              value: row.linked_scan_result?.status ?? "—",
            },
            {
              label: "Latest scan result version",
              value: row.linked_scan_result?.analysis_version ?? "—",
            },
          ]}
        />
      ) : null}
    </article>
  );
}

export default async function FounderWarehouseCandidatePage({
  params,
}: {
  params: { candidateId: string };
}) {
  await requireFounderAccess(`/founder/warehouse/${encodeURIComponent(params.candidateId)}`);

  const detail = await getFounderWarehouseCandidateById(params.candidateId);

  if (!detail.candidate) {
    notFound();
  }

  const candidate = detail.candidate;
  const currentStagingRow = detail.currentStagingRow;
  const promotionReview = detail.promotionReview;
  const interpreterPackage = detail.interpreterPackage;
  const promotionWritePlan = detail.promotionWritePlan;
  const metadataExtraction = candidate.metadata_extraction ?? detail.latestMetadataExtractionPackage;
  const metadataExtractionNormalized = asRecord(metadataExtraction?.normalized_metadata_package);
  const metadataExtractionIdentity = asRecord(metadataExtractionNormalized?.identity);
  const normalizedPackage = detail.latestNormalizedPackage;
  const classificationPackage = detail.latestClassificationPackage;
  const normalizedSummary = (normalizedPackage?.source_summary ?? null) as Record<string, unknown> | null;
  const normalizedVisibleHints = (normalizedPackage?.visible_identity_hints ?? null) as Record<string, unknown> | null;
  const classificationMetadata = (classificationPackage?.metadata_documentation ?? null) as Record<string, unknown> | null;
  const resolverSummary = (classificationPackage?.resolver_summary ?? null) as Record<string, unknown> | null;
  const evidenceFrontPreview = promotionReview?.preview.frontEvidenceUrl ?? null;
  const evidenceBackPreview = promotionReview?.preview.backEvidenceUrl ?? null;
  const promotionWritePlanOutcome = getPromotionWritePlanOutcomeLabel(promotionWritePlan);

  return (
    <PageContainer className="space-y-8 py-8">
      <PageIntro
        eyebrow="Founder Warehouse"
        title="Promotion Review"
        description="Review the app preview first, then the exact write plan. Warehouse history still exists below, but it no longer leads the decision."
        actions={(
          <div className="flex flex-wrap gap-3">
            <Link
              href="/founder/warehouse"
              className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back to queue
            </Link>
            <Link
              href="/founder/staging"
              className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Staging dashboard
            </Link>
          </div>
        )}
      />

      <PageSection surface="card" spacing="default">
        <SectionHeader
          title="Decision Summary"
          description="Start here. This section answers what the candidate becomes, how promotion would behave, and whether anything is still unresolved."
        />
        <div className="flex flex-wrap gap-2">
          <WarehouseBadge value={candidate.state} />
          <WarehouseBadge value={candidate.submission_intent} tone="default" />
          <WarehouseBadge value={interpreterPackage?.decision ?? promotionReview?.candidateTypeLabel ?? "UNRESOLVED"} />
          <WarehouseBadge
            value={interpreterPackage?.proposed_action ?? promotionReview?.actionTypeLabel ?? candidate.proposed_action_type ?? "UNSET"}
            tone="default"
          />
          {interpreterPackage ? <WarehouseBadge value={interpreterPackage.confidence} tone="muted" /> : null}
          {promotionWritePlanOutcome ? (
            <WarehouseBadge value={promotionWritePlanOutcome} />
          ) : null}
        </div>
        <DefinitionGrid
          items={[
            { label: "Candidate id", value: candidate.id },
            { label: "Current state", value: candidate.state },
            { label: "Submission intent", value: candidate.submission_intent },
            { label: "Interpreter decision", value: interpreterPackage?.decision ?? "—" },
            { label: "Interpreter status", value: interpreterPackage?.status ?? "—" },
            { label: "Interpreter confidence", value: interpreterPackage?.confidence ?? "—" },
            { label: "Proposed action", value: interpreterPackage?.proposed_action ?? "—" },
            { label: "Reason code", value: interpreterPackage?.reason_code ?? candidate.interpreter_reason_code ?? "—" },
            { label: "Payload source", value: promotionReview?.payloadSource ?? "—" },
            { label: "Promotion result preview", value: promotionWritePlanOutcome ?? candidate.promotion_result_type ?? "—" },
            { label: "Current staging id", value: candidate.current_staging_id ?? "—" },
            { label: "TCGplayer id", value: candidate.tcgplayer_id ?? "—" },
            { label: "Hold reason", value: candidate.current_review_hold_reason ?? interpreterPackage?.reason_code ?? "—" },
            { label: "Created", value: formatTimestamp(candidate.created_at) },
            { label: "Updated", value: formatTimestamp(candidate.updated_at) },
            { label: "Founder approved at", value: formatTimestamp(candidate.founder_approved_at) },
            { label: "Promoted at", value: formatTimestamp(candidate.promoted_at) },
            { label: "Notes", value: candidate.notes },
          ]}
        />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
          <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Promotion call</p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                {interpreterPackage?.founder_explanation ?? promotionReview?.decisionSummary ?? "No promotion interpretation is available yet."}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Interpreter explanation</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {interpreterPackage?.founder_explanation ?? candidate.interpreter_explanation ?? "No interpreter explanation recorded yet."}
              </p>
            </div>
          </div>
          <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-5">
            <DefinitionGrid
              items={[
                { label: "Candidate summary decision", value: candidate.interpreter_decision ?? "—" },
                { label: "Candidate summary reason", value: candidate.interpreter_reason_code ?? "—" },
                { label: "Resolved finish key", value: interpreterPackage?.canon_context.finish_key ?? candidate.interpreter_resolved_finish_key ?? "—" },
                {
                  label: "Needs promotion review",
                  value: (
                    <WarehouseBadge
                      value={candidate.needs_promotion_review === true}
                      tone={candidate.needs_promotion_review ? "warning" : "muted"}
                    />
                  ),
                },
                { label: "Founder approval notes", value: candidate.founder_approval_notes ?? "—" },
                { label: "Promotion result", value: candidate.promotion_result_type ?? "—" },
                { label: "Matched card print", value: interpreterPackage?.canon_context.matched_card_print_id ?? promotionReview?.references.matchedCardPrintId ?? "—" },
                { label: "Matched card printing", value: interpreterPackage?.canon_context.matched_card_printing_id ?? promotionReview?.references.matchedCardPrintingId ?? "—" },
              ]}
            />
          </div>
        </div>
        {interpreterPackage?.status === "BLOCKED" ? (
          <InterpreterBlockingPanel interpreter={interpreterPackage} />
        ) : promotionReview?.unresolved ? (
          <BlockingIssuesPanel unresolved={promotionReview.unresolved} />
        ) : null}
        {interpreterPackage?.status === "READY" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <SupportingList
              title="Evidence gaps"
              items={interpreterPackage.evidence_gaps}
              emptyMessage="No evidence gaps were recorded for the current interpretation."
            />
            <SupportingList
              title="Next actions"
              items={interpreterPackage.next_actions}
              emptyMessage="No next actions were recorded."
            />
          </div>
        ) : null}
        <div className="space-y-4">
          <WarehouseFounderActionPanel candidateId={candidate.id} candidateState={candidate.state} />
          {currentStagingRow ? (
            <div className="space-y-3">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-5 text-sm text-slate-700">
                Current staging row:
                {" "}
                <Link href="/founder/staging" className="underline decoration-slate-300 underline-offset-4">
                  {currentStagingRow.id}
                </Link>
                {" "}
                ({currentStagingRow.execution_status})
              </div>
              <WarehouseStagingExecutionPanel
                stagingId={currentStagingRow.id}
                candidateId={candidate.id}
                executionStatus={currentStagingRow.execution_status}
                executionAttempts={currentStagingRow.execution_attempts}
                lastError={currentStagingRow.last_error}
                lastAttemptedAt={currentStagingRow.last_attempted_at}
                executedAt={currentStagingRow.executed_at}
                promotionResultType={candidate.promotion_result_type}
                promotedCardPrintId={candidate.promoted_card_print_id}
                promotedCardPrintingId={candidate.promoted_card_printing_id}
                promotedImageTargetType={candidate.promoted_image_target_type}
                promotedImageTargetId={candidate.promoted_image_target_id}
              />
            </div>
          ) : null}
        </div>
      </PageSection>

      <PageSection surface="card" spacing="default">
        <SectionHeader
          title="App Preview"
          description="Best available normalized preview of how this card resolves in Grookai. Unresolved fields stay explicit."
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
          <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 px-5 py-5">
            <PublicCardImage
              src={promotionReview?.preview.imageUrl ?? undefined}
              alt={promotionReview?.preview.displayName ?? "Promotion preview"}
              imageClassName="mx-auto aspect-[3/4] h-auto w-full max-w-[320px] rounded-[1.25rem] border border-slate-200 bg-white object-contain p-2"
              fallbackClassName="mx-auto flex aspect-[3/4] w-full max-w-[320px] items-center justify-center rounded-[1.25rem] border border-dashed border-slate-300 bg-white px-6 text-center text-sm text-slate-500"
              fallbackLabel="No preview image is safely available yet."
            />
            <div className="flex flex-wrap gap-2">
              <WarehouseBadge value={promotionReview?.candidateTypeLabel ?? "Unresolved"} tone="default" />
              {promotionWritePlanOutcome ? (
                <WarehouseBadge value={promotionWritePlanOutcome} />
              ) : null}
            </div>
            <DefinitionGrid
              items={[
                { label: "Display name", value: promotionReview?.preview.displayName ?? "—" },
                { label: "Set display", value: promotionReview?.preview.setDisplay ?? "—" },
                { label: "Printed number", value: promotionReview?.preview.printedNumber ?? "—" },
                { label: "Variant / modifier", value: promotionReview?.preview.variantLabel ?? "—" },
                { label: "Finish", value: promotionReview?.preview.finishLabel ?? "—" },
                { label: "Preview source", value: promotionReview?.preview.imageOriginLabel ?? "—" },
              ]}
            />
            {promotionReview?.preview.unresolvedReason ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                {promotionReview.preview.unresolvedReason}
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            {(evidenceFrontPreview || evidenceBackPreview) ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {evidenceFrontPreview ? (
                  <a href={evidenceFrontPreview} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
                    <img src={evidenceFrontPreview} alt="Front evidence preview" className="aspect-[3/4] h-full w-full object-cover transition group-hover:scale-[1.01]" />
                    <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-700">Front evidence</div>
                  </a>
                ) : null}
                {evidenceBackPreview ? (
                  <a href={evidenceBackPreview} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
                    <img src={evidenceBackPreview} alt="Back evidence preview" className="aspect-[3/4] h-full w-full object-cover transition group-hover:scale-[1.01]" />
                    <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-700">Back evidence</div>
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-5 text-sm text-slate-600">
                No additional safe evidence preview is available yet.
              </div>
            )}
          </div>
        </div>
      </PageSection>

      <PageSection surface="card" spacing="default">
        <SectionHeader
          title="Promotion Write Plan"
          description="Deterministic founder-safe preview of what Promotion Executor V1 will create, reuse, update, or leave untouched."
        />
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-5">
          <div className="flex flex-wrap gap-2">
            <WarehouseBadge value={promotionWritePlan?.status ?? "BLOCKED"} />
            {promotionWritePlanOutcome ? (
              <WarehouseBadge value={promotionWritePlanOutcome} />
            ) : null}
            {interpreterPackage ? <WarehouseBadge value={interpreterPackage.decision} tone="default" /> : null}
          </div>
          {promotionWritePlan?.status === "BLOCKED" ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-950">
              <p className="font-semibold">{promotionWritePlan.reason}</p>
              <p className="mt-1">
                {promotionWritePlan.missing_requirements.length > 0
                  ? promotionWritePlan.missing_requirements.join(" • ")
                  : "No additional requirements were recorded."}
              </p>
            </div>
          ) : null}
          <p className="mt-3 text-sm leading-7 text-slate-800">
            {promotionWritePlan?.reason ?? "No promotion write plan is available yet."}
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {promotionWritePlan ? (
            <>
              <PromotionWriteActionCard domain="card_prints" action={promotionWritePlan.actions.card_prints} />
              <PromotionWriteActionCard domain="card_printings" action={promotionWritePlan.actions.card_printings} />
              <PromotionWriteActionCard domain="external_mappings" action={promotionWritePlan.actions.external_mappings} />
              <PromotionWriteActionCard domain="image_fields" action={promotionWritePlan.actions.image_fields} />
            </>
          ) : null}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <JsonDisclosure label="Write plan before state" value={promotionWritePlan?.preview.before ?? null} />
          <JsonDisclosure label="Write plan after state" value={promotionWritePlan?.preview.after ?? null} />
        </div>
      </PageSection>

      <PageSection surface="card" spacing="default">
        <SectionHeader
          title="Existing vs New"
          description="Human-readable comparison of what canon already has versus what this candidate would add or repair."
        />
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-5 text-sm leading-7 text-slate-800">
          {promotionReview?.comparison.summary ?? "No comparison summary is available yet."}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <SupportingList
            title="Already In Canon"
            items={promotionReview?.comparison.existing ?? []}
            emptyMessage="No existing canonical target has been resolved yet."
          />
          <SupportingList
            title="Promotion Introduces"
            items={promotionReview?.comparison.introduced ?? []}
            emptyMessage="This promotion currently introduces no new canonical write."
          />
        </div>
        <SupportingList
          title="Identity Delta"
          items={promotionReview?.comparison.delta ?? []}
          emptyMessage="No explicit identity delta has been recorded yet."
        />
        {interpreterPackage ? (
          <JsonDisclosure label="Interpreter package JSON" value={interpreterPackage} />
        ) : null}
      </PageSection>

      <PageSection surface="card" spacing="default">
        <SectionHeader
          title={`Supporting Evidence (${detail.evidenceRows.length})`}
          description="Founder-readable evidence, including safe image previews and any linked snapshot or scan context."
        />
        {detail.evidenceRows.length === 0 ? (
          <p className="text-sm text-slate-600">No evidence rows are linked to this candidate.</p>
        ) : (
          <div className="space-y-4">
            {detail.evidenceRows.map((row) => (
              <EvidenceCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </PageSection>

      <PageSection surface="card" spacing="default">
        <SectionHeader
          title="Promotion Interpretation"
          description="Normalized and classified interpretation remains supporting context. Decision-making above stays grounded in the candidate summary plus deterministic promotion planning."
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">Normalized package</h3>
            <DefinitionGrid
              items={[
                { label: "Normalization status", value: renderScalar(normalizedPackage?.normalization_status) },
                { label: "Source strength", value: renderScalar(normalizedPackage?.source_strength) },
                { label: "Normalization confidence", value: renderScalar(normalizedPackage?.normalization_confidence) },
                { label: "Evidence gaps", value: renderScalar(normalizedPackage?.evidence_gaps) },
              ]}
            />
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Source summary</p>
              {renderStructuredEntries(normalizedSummary)}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Visible identity hints</p>
              {renderStructuredEntries(normalizedVisibleHints)}
            </div>
            <JsonDisclosure label="Normalized package JSON" value={normalizedPackage} />
          </div>

          <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">Classification package</h3>
            <DefinitionGrid
              items={[
                { label: "Classification status", value: renderScalar(classificationPackage?.classification_status) },
                { label: "Interpreter decision", value: renderScalar(classificationPackage?.interpreter_decision) },
                { label: "Reason code", value: renderScalar(classificationPackage?.interpreter_reason_code) },
                { label: "Proposed action", value: renderScalar(classificationPackage?.proposed_action_type) },
              ]}
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Interpreter explanation</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-900">
                {classificationPackage?.interpreter_explanation
                  ? String(classificationPackage.interpreter_explanation)
                  : "No classification payload recorded yet."}
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Resolver summary</p>
              {renderStructuredEntries(resolverSummary)}
            </div>
            {classificationMetadata ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Metadata documentation</p>
                {renderStructuredEntries(classificationMetadata)}
              </div>
            ) : null}
            <JsonDisclosure label="Classification package JSON" value={classificationPackage} />
          </div>
        </div>
        {metadataExtraction ? (
          <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">Metadata extraction package</h3>
            <DefinitionGrid
              items={[
                { label: "Event type", value: metadataExtraction.event_type },
                { label: "Recorded at", value: formatTimestamp(metadataExtraction.created_at) },
                {
                  label: "Extraction status",
                  value: renderScalar(metadataExtractionNormalized?.status),
                },
                {
                  label: "Extraction confidence",
                  value: renderScalar(metadataExtractionNormalized?.confidence),
                },
                {
                  label: "Extracted name",
                  value: renderScalar(metadataExtractionIdentity?.name),
                },
                {
                  label: "Extracted number",
                  value: renderScalar(metadataExtractionIdentity?.printed_number),
                },
                {
                  label: "Extracted set",
                  value: renderScalar(metadataExtractionIdentity?.set_name) !== "—"
                    ? `${renderScalar(metadataExtractionIdentity?.set_name)} (${renderScalar(metadataExtractionIdentity?.set_code)})`
                    : renderScalar(metadataExtractionIdentity?.set_code),
                },
              ]}
            />
            <JsonDisclosure label="Metadata extraction JSON" value={metadataExtraction} />
          </div>
        ) : null}
      </PageSection>

      <PageSection surface="card" spacing="default">
        <SectionHeader
          title="Warehouse History"
          description="Detailed lifecycle history is still available for audit, but it is supporting context rather than the primary founder review surface."
        />
        <details className="rounded-[1.5rem] border border-slate-200 bg-slate-50" open={false}>
          <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-slate-900">
            Open warehouse history
          </summary>
          <div className="space-y-6 border-t border-slate-200 px-5 py-5">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                Staging history ({detail.stagingRows.length})
              </h3>
              {detail.stagingRows.length === 0 ? (
                <p className="text-sm text-slate-600">No staging rows recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {detail.stagingRows.map((stagingRow) => (
                    <article key={stagingRow.id} className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <WarehouseBadge value={stagingRow.execution_status} />
                            <WarehouseBadge value={stagingRow.approved_action_type} tone="default" />
                          </div>
                          <p className="text-sm text-slate-900">{stagingRow.id}</p>
                        </div>
                        <p className="text-sm text-slate-500">Staged {formatTimestamp(stagingRow.staged_at)}</p>
                      </div>
                      <DefinitionGrid
                        items={[
                          { label: "Founder approved at", value: formatTimestamp(stagingRow.founder_approved_at) },
                          { label: "Attempts", value: String(stagingRow.execution_attempts) },
                          { label: "Last attempted at", value: formatTimestamp(stagingRow.last_attempted_at) },
                          { label: "Executed at", value: formatTimestamp(stagingRow.executed_at) },
                          { label: "Last error", value: stagingRow.last_error ?? "—" },
                        ]}
                      />
                      <JsonDisclosure label="Frozen staging payload" value={stagingRow.frozen_payload} />
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                Event history ({detail.eventRows.length})
              </h3>
              {detail.eventRows.length === 0 ? (
                <p className="text-sm text-slate-600">No warehouse events recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {detail.eventRows.map((eventRow) => (
                    <article key={eventRow.id} className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <WarehouseBadge value={eventRow.event_type} tone="default" />
                            <WarehouseBadge value={eventRow.action} tone="muted" />
                            <WarehouseBadge value={eventRow.actor_type} tone="muted" />
                          </div>
                          <p className="text-sm leading-6 text-slate-900">
                            {eventRow.previous_state ?? "—"} → {eventRow.next_state ?? "—"}
                          </p>
                          <p className="text-sm text-slate-600">
                            Actor {eventRow.actor_user_id ?? "SYSTEM"}
                          </p>
                        </div>
                        <p className="text-sm text-slate-500">{formatTimestamp(eventRow.created_at)}</p>
                      </div>
                      <div className="mt-4">
                        <JsonDisclosure label="Event metadata" value={eventRow.metadata} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </details>
      </PageSection>
    </PageContainer>
  );
}
