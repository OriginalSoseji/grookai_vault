import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import readline from "node:readline";

export const CARD_VISUAL_SEARCH_CURATED_CAMEO_VERSION =
  "CARD_VISUAL_SEARCH_CURATED_CAMEO_V1";

const ACCEPTED_RECONCILIATION_STATUSES = new Set([
  "existing_approved_cameo_match",
  "exact_canonical_match",
  "founder_image_confirmed",
]);

const REPRESENTATION_MODES = new Set([
  "accessory",
  "clothing",
  "costume",
  "food",
  "logo",
  "mask",
  "pillow",
  "plush",
  "statue",
  "toy",
]);

const DEPICTED_MODES = new Set([
  "card",
  "painting",
  "picture",
  "poster",
  "screen",
  "sign",
]);

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function governanceStatus(row) {
  if (row.reconciliation_status === "existing_approved_cameo_match") {
    return "existing_approved";
  }
  if (row.reconciliation_status === "founder_image_confirmed") {
    return "human_image_confirmed";
  }
  return "external_exact_candidate";
}

function evidenceStrength(row) {
  return ["existing_approved", "human_image_confirmed"].includes(
    governanceStatus(row),
  )
    ? "high"
    : "medium";
}

function evidenceConfidence(row) {
  return ["existing_approved", "human_image_confirmed"].includes(
    governanceStatus(row),
  )
    ? 1
    : 0.9;
}

function mappedSubjectRole(displayMode) {
  if (REPRESENTATION_MODES.has(displayMode)) return "character_representation";
  if (DEPICTED_MODES.has(displayMode)) return "depicted_subject";
  return null;
}

function sharedEvidence(row, cardPrintId) {
  return {
    source_id: row.source_record_id,
    module: "curated_cameos",
    category: "external_curated_reference",
    supporting_observation_ids: [],
    supporting_external_evidence_ids: [row.source_record_id],
    confidence: evidenceConfidence(row),
    evidence_strength: evidenceStrength(row),
    authority: row.authority ?? "external_curated_reference",
    source_name: row.source ?? null,
    governance_status: governanceStatus(row),
    source_card_print_id: cardPrintId,
    cameo_identity: row.cameo_identity,
    cameo_identity_kind: row.cameo_identity_kind,
    display_mode_terms: unique(row.display_mode_terms ?? []),
    representation_details: unique(row.representation_details ?? []),
    proves_fact_graph_observation: false,
  };
}

export function curatedCameoEntriesV1(row) {
  const cardPrintId = row.canonical_match?.card_print_id ?? null;
  if (
    !cardPrintId ||
    !row.source_record_id ||
    !row.cameo_identity ||
    !ACCEPTED_RECONCILIATION_STATUSES.has(row.reconciliation_status)
  ) {
    return [];
  }

  const shared = sharedEvidence(row, cardPrintId);
  const entries = [
    {
      ...shared,
      source_type: "curated_cameo",
      field_path: "curated_cameos.identity",
      term: `cameo subject: ${row.cameo_identity}`,
      subject_role: "curated_cameo",
    },
  ];

  for (const displayMode of shared.display_mode_terms) {
    const subjectRole = mappedSubjectRole(displayMode);
    if (!subjectRole) continue;
    const normalizedMode = displayMode === "food" ? "food shape" : displayMode;
    const details = shared.representation_details.length
      ? `: ${shared.representation_details.join(" ")}`
      : "";
    entries.push({
      ...shared,
      source_type: "curated_cameo_role",
      field_path:
        subjectRole === "character_representation"
          ? "curated_cameos.representation_form"
          : "curated_cameos.depicted_surface",
      term: `${subjectRole}: ${row.cameo_identity}: ${normalizedMode}${details}`,
      subject_role: subjectRole,
      display_mode_term: displayMode,
    });
  }
  return entries;
}

export async function loadCuratedCameoReferenceRowsV1(filePath) {
  const rows = [];
  const stream = readline.createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });
  for await (const line of stream) {
    if (line.trim()) rows.push(JSON.parse(line));
  }
  return rows;
}

export async function loadReviewedVisualEvidenceV1(filePath) {
  const payload = JSON.parse(await fs.readFile(filePath, "utf8"));
  if (!Array.isArray(payload.records)) {
    throw new Error("reviewed visual evidence must contain records");
  }
  return payload.records;
}

export function attachCuratedCameoEvidenceV1(groups, rows) {
  const groupIdByCardPrintId = new Map();
  for (const group of groups) {
    for (const printing of group.printings ?? []) {
      groupIdByCardPrintId.set(printing.card_print_id, group.artwork_group_id);
    }
  }

  const entriesByGroupId = new Map();
  let acceptedRows = 0;
  let outsideProjectionRows = 0;
  let rejectedRows = 0;
  for (const row of rows) {
    const entries = curatedCameoEntriesV1(row);
    if (!entries.length) {
      rejectedRows += 1;
      continue;
    }
    const groupId = groupIdByCardPrintId.get(
      row.canonical_match.card_print_id,
    );
    if (!groupId) {
      outsideProjectionRows += 1;
      continue;
    }
    acceptedRows += 1;
    if (!entriesByGroupId.has(groupId)) entriesByGroupId.set(groupId, []);
    entriesByGroupId.get(groupId).push(...entries);
  }

  const decoratedGroups = groups.map((group) => {
    const entries = entriesByGroupId.get(group.artwork_group_id) ?? [];
    if (!entries.length) return group;
    const subjectRoleKeys = unique(
      entries.map((entry) => entry.subject_role),
    ).sort();
    return {
      ...group,
      search_entries: undefined,
      search_entries_unique: undefined,
      documents: {
        ...group.documents,
        curated_cameo: {
          search_document_id: `curated-cameo-${group.artwork_group_id}`,
          artwork_group_id: group.artwork_group_id,
          document_type: "curated_cameo",
          projection_status: "runtime_external_evidence",
          canonical_context: {
            name: group.name,
            branch: group.branch,
          },
          subject_role_keys: subjectRoleKeys,
          structured_concepts: entries.sort(
            (left, right) =>
              left.cameo_identity.localeCompare(right.cameo_identity) ||
              left.term.localeCompare(right.term) ||
              left.source_id.localeCompare(right.source_id),
          ),
        },
      },
      curated_cameo_summary: {
        relationship_count: entries.filter(
          (entry) => entry.source_type === "curated_cameo",
        ).length,
        identities: unique(entries.map((entry) => entry.cameo_identity)).sort(),
        governance_statuses: unique(
          entries.map((entry) => entry.governance_status),
        ).sort(),
      },
    };
  });

  const attachedEntries = [...entriesByGroupId.values()].flat();
  return {
    version: CARD_VISUAL_SEARCH_CURATED_CAMEO_VERSION,
    groups: decoratedGroups,
    stats: {
      input_rows: rows.length,
      accepted_rows: acceptedRows,
      rejected_rows: rejectedRows,
      outside_projection_rows: outsideProjectionRows,
      artwork_groups_with_cameos: entriesByGroupId.size,
      attached_entries: attachedEntries.length,
      approved_relationships: attachedEntries.filter(
        (entry) =>
          entry.source_type === "curated_cameo" &&
          entry.governance_status === "existing_approved",
      ).length,
      candidate_relationships: attachedEntries.filter(
        (entry) =>
          entry.source_type === "curated_cameo" &&
          entry.governance_status === "external_exact_candidate",
      ).length,
      human_confirmed_relationships: attachedEntries.filter(
        (entry) =>
          entry.source_type === "curated_cameo" &&
          entry.governance_status === "human_image_confirmed",
      ).length,
    },
    boundaries: {
      projection_mutated: false,
      fact_graph_mutated: false,
      database_reads: 0,
      database_writes: 0,
      search_activation: false,
    },
  };
}
