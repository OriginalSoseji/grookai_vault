import fs from "node:fs/promises";

import {
  sha256JsonV1,
} from "./card_visual_corpus_v1_inventory.mjs";

export const CARD_VISUAL_SEARCH_EVIDENCE_SUPPRESSION_VERSION =
  "CARD_VISUAL_SEARCH_EVIDENCE_SUPPRESSION_V1";

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function normalizedRecord(record) {
  const normalized = {
    suppression_id: String(record?.suppression_id ?? "").trim(),
    authority: String(record?.authority ?? "").trim(),
    decision: String(record?.decision ?? "").trim(),
    reviewed_at: String(record?.reviewed_at ?? "").trim(),
    reviewed_by: String(record?.reviewed_by ?? "").trim(),
    artwork_group_id: String(record?.artwork_group_id ?? "").trim(),
    card_print_id: String(record?.card_print_id ?? "").trim(),
    gv_id: String(record?.gv_id ?? "").trim(),
    source_image_sha256: String(record?.source_image_sha256 ?? "").trim(),
    target_observation_ids: uniqueSorted(
      record?.target_observation_ids ?? [],
    ),
    target_source_ids: uniqueSorted(record?.target_source_ids ?? []),
    rationale: String(record?.rationale ?? "").trim(),
    replacement_authorized: record?.replacement_authorized === true,
  };
  normalized.suppression_hash = sha256JsonV1(normalized);
  return normalized;
}

function assertRecord(record) {
  if (
    !/^founder_suppression_[a-z0-9_]+_v\d+$/u.test(
      record.suppression_id,
    )
  ) {
    throw new Error(`invalid suppression_id: ${record.suppression_id}`);
  }
  if (record.authority !== "founder_image_review") {
    throw new Error(`${record.suppression_id}: unsupported authority`);
  }
  if (record.decision !== "unsupported_visual_evidence") {
    throw new Error(`${record.suppression_id}: unsupported decision`);
  }
  if (!/^[0-9a-f-]{36}$/u.test(record.card_print_id)) {
    throw new Error(`${record.suppression_id}: invalid card_print_id`);
  }
  if (!/^cvag_[0-9a-f]{24}$/u.test(record.artwork_group_id)) {
    throw new Error(`${record.suppression_id}: invalid artwork_group_id`);
  }
  if (!/^[0-9a-f]{64}$/u.test(record.source_image_sha256)) {
    throw new Error(`${record.suppression_id}: invalid source image hash`);
  }
  if (
    !record.target_observation_ids.length &&
    !record.target_source_ids.length
  ) {
    throw new Error(`${record.suppression_id}: no evidence target`);
  }
  if (!record.rationale) {
    throw new Error(`${record.suppression_id}: rationale is required`);
  }
  if (record.replacement_authorized) {
    throw new Error(
      `${record.suppression_id}: suppressions cannot invent replacement facts`,
    );
  }
}

export async function loadCardVisualSearchEvidenceSuppressionsV1(filePath) {
  const payload = JSON.parse(await fs.readFile(filePath, "utf8"));
  if (payload?.version !== CARD_VISUAL_SEARCH_EVIDENCE_SUPPRESSION_VERSION) {
    throw new Error("unsupported evidence suppression version");
  }
  const records = (payload.records ?? []).map(normalizedRecord);
  for (const record of records) assertRecord(record);
  if (
    new Set(records.map((row) => row.suppression_id)).size !== records.length
  ) {
    throw new Error("duplicate evidence suppression id");
  }
  return records;
}

export function buildCardVisualSearchEvidenceSuppressionIndexV1(
  records,
  groups,
) {
  const groupById = new Map(
    groups.map((group) => [group.artwork_group_id, group]),
  );
  const byGroup = new Map();
  for (const record of records) {
    const group = groupById.get(record.artwork_group_id);
    if (!group) {
      throw new Error(
        `${record.suppression_id}: artwork group is not in the projection`,
      );
    }
    const printing = (group.printings ?? []).find(
      (row) => row.card_print_id === record.card_print_id,
    );
    if (!printing || printing.gv_id !== record.gv_id) {
      throw new Error(
        `${record.suppression_id}: canonical printing snapshot mismatch`,
      );
    }
    if (printing.source_image_sha256 !== record.source_image_sha256) {
      throw new Error(
        `${record.suppression_id}: source image hash mismatch`,
      );
    }
    const rows = byGroup.get(record.artwork_group_id) ?? [];
    rows.push(record);
    byGroup.set(record.artwork_group_id, rows);
  }
  return byGroup;
}

export function evidenceEntrySuppressionV1(entry, records = []) {
  const sourceId = String(entry?.source_id ?? "");
  const observationIds = new Set(
    entry?.supporting_observation_ids ?? [],
  );
  return (
    records.find(
      (record) =>
        record.target_source_ids.includes(sourceId) ||
        record.target_observation_ids.some((id) =>
          observationIds.has(id),
        ),
    ) ?? null
  );
}

export function applyCardVisualSearchEvidenceSuppressionsV1(
  groups,
  records,
) {
  const byGroup = buildCardVisualSearchEvidenceSuppressionIndexV1(
    records,
    groups,
  );
  const matchesBySuppression = new Map(
    records.map((record) => [record.suppression_id, 0]),
  );
  let removedEntries = 0;
  const effectiveGroups = groups.map((group) => {
    const suppressions = byGroup.get(group.artwork_group_id) ?? [];
    if (!suppressions.length) return group;
    const documents = Object.fromEntries(
      Object.entries(group.documents).map(([type, document]) => {
        const structuredConcepts = [];
        for (const entry of document.structured_concepts ?? []) {
          const suppression = evidenceEntrySuppressionV1(
            entry,
            suppressions,
          );
          if (!suppression) {
            structuredConcepts.push(entry);
            continue;
          }
          removedEntries += 1;
          matchesBySuppression.set(
            suppression.suppression_id,
            matchesBySuppression.get(suppression.suppression_id) + 1,
          );
        }
        return [
          type,
          {
            ...document,
            structured_concepts: structuredConcepts,
            subject_role_keys: uniqueSorted(
              structuredConcepts.map((entry) => entry.subject_role),
            ),
          },
        ];
      }),
    );
    return {
      ...group,
      documents,
      evidence_suppressions: suppressions,
    };
  });
  for (const [suppressionId, matches] of matchesBySuppression) {
    if (!matches) {
      throw new Error(
        `${suppressionId}: suppression matched no evidence`,
      );
    }
  }
  return {
    groups: effectiveGroups,
    stats: {
      suppression_records: records.length,
      affected_artwork_groups: byGroup.size,
      removed_structured_concepts: removedEntries,
      matches_by_suppression: Object.fromEntries(matchesBySuppression),
    },
  };
}
