/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  const latestStagingRow = detail.stagingRows[0] ?? null;
  const normalizedPackage = detail.latestNormalizedPackage;
  const classificationPackage = detail.latestClassificationPackage;
  const normalizedSummary = (normalizedPackage?.source_summary ?? null) as Record<string, unknown> | null;
  const normalizedVisibleHints = (normalizedPackage?.visible_identity_hints ?? null) as Record<string, unknown> | null;
  const normalizedRawMetadata = (normalizedPackage?.raw_metadata_documentation ?? null) as Record<string, unknown> | null;
  const classificationMetadata = (classificationPackage?.metadata_documentation ?? null) as Record<string, unknown> | null;
  const resolverSummary = (classificationPackage?.resolver_summary ?? null) as Record<string, unknown> | null;

  return (
    <PageContainer className="space-y-8 py-8">
      <PageIntro
        eyebrow="Founder Warehouse"
        title="Warehouse Candidate Detail"
        description="Candidate row is the primary review summary. Event metadata remains detailed append-only history."
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
        <SectionHeader title="Candidate summary" description="Current warehouse lifecycle and intake summary." />
        <div className="flex flex-wrap gap-2">
          <WarehouseBadge value={candidate.state} />
          <WarehouseBadge value={candidate.submission_intent} tone="default" />
          <WarehouseBadge value={candidate.proposed_action_type ?? "UNSET"} />
        </div>
        <DefinitionGrid
          items={[
            { label: "Candidate id", value: candidate.id },
            { label: "Submitted by", value: candidate.submitted_by_user_id },
            { label: "Submission type", value: candidate.submission_type },
            { label: "Intake channel", value: candidate.intake_channel },
            { label: "TCGplayer id", value: candidate.tcgplayer_id ?? "—" },
            { label: "Created", value: formatTimestamp(candidate.created_at) },
            { label: "Updated", value: formatTimestamp(candidate.updated_at) },
            { label: "Current staging id", value: candidate.current_staging_id ?? "—" },
            { label: "Notes", value: candidate.notes },
          ]}
        />
      </PageSection>

      <PageSection surface="card" spacing="default">
        <SectionHeader title="Classification summary" description="Read from the candidate row first for founder review." />
        <DefinitionGrid
          items={[
            { label: "Interpreter decision", value: candidate.interpreter_decision ?? "—" },
            { label: "Reason code", value: candidate.interpreter_reason_code ?? "—" },
            { label: "Resolved finish key", value: candidate.interpreter_resolved_finish_key ?? "—" },
            { label: "Proposed action", value: candidate.proposed_action_type ?? "—" },
            {
              label: "Needs promotion review",
              value: (
                <WarehouseBadge
                  value={candidate.needs_promotion_review === true}
                  tone={candidate.needs_promotion_review ? "warning" : "muted"}
                />
              ),
            },
            { label: "Hold reason", value: candidate.current_review_hold_reason ?? "—" },
          ]}
        />
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Interpreter explanation</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-900">
            {candidate.interpreter_explanation ?? "No interpreter explanation recorded yet."}
          </p>
        </div>
      </PageSection>

      <PageSection surface="card" spacing="default">
        <SectionHeader
          title="Founder operations summary"
          description="Founder decision fields live on the candidate row. Staging remains a separate execution truth."
        />
        <DefinitionGrid
          items={[
            { label: "Founder approved by", value: candidate.founder_approved_by_user_id ?? "—" },
            { label: "Founder approved at", value: formatTimestamp(candidate.founder_approved_at) },
            { label: "Founder approval notes", value: candidate.founder_approval_notes ?? "—" },
            { label: "Rejected by", value: candidate.rejected_by_user_id ?? "—" },
            { label: "Rejected at", value: formatTimestamp(candidate.rejected_at) },
            { label: "Rejection notes", value: candidate.rejection_notes ?? "—" },
            { label: "Archived by", value: candidate.archived_by_user_id ?? "—" },
            { label: "Archived at", value: formatTimestamp(candidate.archived_at) },
            { label: "Archive notes", value: candidate.archive_notes ?? "—" },
            { label: "Promotion result", value: candidate.promotion_result_type ?? "—" },
            { label: "Promoted by", value: candidate.promoted_by_user_id ?? "—" },
            { label: "Promoted at", value: formatTimestamp(candidate.promoted_at) },
          ]}
        />

        <div className="mt-4">
          <WarehouseFounderActionPanel candidateId={candidate.id} candidateState={candidate.state} />
        </div>
      </PageSection>

      {latestStagingRow && candidate.current_staging_id === latestStagingRow.id ? (
        <PageSection surface="card" spacing="default">
          <SectionHeader
            title="Promotion execution"
            description="Execution remains separate from review. Founder UI can trigger only the protected executor path for the current staging row."
          />
          <div className="mb-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-5 text-sm text-slate-700">
            <p>
              Current staging row:
              {" "}
              <Link
                href="/founder/staging"
                className="underline decoration-slate-300 underline-offset-4"
              >
                {latestStagingRow.id}
              </Link>
              {" "}
              ({latestStagingRow.execution_status})
            </p>
          </div>
          <WarehouseStagingExecutionPanel
            stagingId={latestStagingRow.id}
            candidateId={candidate.id}
            executionStatus={latestStagingRow.execution_status}
            executionAttempts={latestStagingRow.execution_attempts}
            lastError={latestStagingRow.last_error}
            lastAttemptedAt={latestStagingRow.last_attempted_at}
            executedAt={latestStagingRow.executed_at}
            promotionResultType={candidate.promotion_result_type}
            promotedCardPrintId={candidate.promoted_card_print_id}
            promotedCardPrintingId={candidate.promoted_card_printing_id}
            promotedImageTargetType={candidate.promoted_image_target_type}
            promotedImageTargetId={candidate.promoted_image_target_id}
          />
        </PageSection>
      ) : null}

      <PageSection surface="card" spacing="default">
        <SectionHeader
          title={`Evidence (${detail.evidenceRows.length})`}
          description="All linked warehouse evidence rows plus any readable linked snapshot or scan context."
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
          title="Normalization and classification detail"
          description="Detailed payloads from warehouse event metadata. Candidate summary above remains the primary review surface."
        />

        <div className="space-y-4">
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
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Source summary</p>
                {renderStructuredEntries(normalizedSummary)}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Visible identity hints</p>
                {renderStructuredEntries(normalizedVisibleHints)}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Raw metadata documentation</p>
                {renderStructuredEntries(normalizedRawMetadata)}
              </div>
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
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Metadata documentation</p>
              {renderStructuredEntries(classificationMetadata)}
            </div>
            <JsonDisclosure label="Classification package JSON" value={classificationPackage} />
          </div>
        </div>
      </PageSection>

      <PageSection surface="card" spacing="default">
        <SectionHeader
          title={`Staging history (${detail.stagingRows.length})`}
          description="Staging rows are execution truth once a candidate is staged. Promotion execution remains out of scope here."
        />
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
                    { label: "Staged by", value: stagingRow.staged_by_user_id },
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
      </PageSection>

      <PageSection surface="card" spacing="default">
        <SectionHeader
          title={`Event history (${detail.eventRows.length})`}
          description="Chronological warehouse event history with expandable metadata. This is detailed history, not primary review truth."
        />
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
      </PageSection>
    </PageContainer>
  );
}
