import crypto from "node:crypto";

import { v5 as uuidV5 } from "uuid";

export const COLLECTIBLE_WAVE1_PARENT_APPLY_PROPOSAL_VERSION =
  "COLLECTIBLE_WAVE1_PARENT_APPLY_PROPOSAL_V1";
export const COLLECTIBLE_WAVE1_PARENT_IDENTITY_KEY_VERSION =
  "COLLECTIBLE_WAVE1_ENGLISH_PARENT_IDENTITY_V1";
export const COLLECTIBLE_WAVE1_PARENT_MIGRATION_VERSION = "20260829230000";
export const COLLECTIBLE_WAVE1_PARENT_UUID_NAMESPACE =
  "2f1a6115-f532-50f9-b661-0605286b5092";

export const COLLECTIBLE_WAVE1_PARENT_INPUT = Object.freeze({
  workflow_run_id: 33239106476,
  artifact_id: 9710816572,
  artifact_name: "collectible-wave1-card-identity-proposal-33239106476",
  producer_sha: "d568c746f15ab506992dde19c7e2db01cd2c93a7",
  proposal_fingerprint_sha256:
    "968e0329fc021a8f5602c3f253876671127a11ba33749ce79baaaae21c01157f",
  parent_proposals: Object.freeze({
    bytes: 34992301,
    sha256: "ff10aebfb949fe16e4e8d9794eb66511cc21f09f4b4f04ef6144a9e8aaab5c4d",
  }),
  source_printing_evidence: Object.freeze({
    bytes: 26231300,
    sha256: "d8dc7622c5550cace29648d2baeda41257450ce1f2ea84b4de6e87000efc44d1",
  }),
});

export const COLLECTIBLE_WAVE1_PARENT_EXPECTED = Object.freeze({
  input_parent_count: 27835,
  proposal_ready_parent_count: 26719,
  review_required_parent_count: 1116,
  source_printing_evidence_count: 33161,
  selected_source_evidence_count: 31766,
  parent_counts_by_game: Object.freeze({ gundam: 206, yugioh: 26513 }),
  evidence_counts_by_game: Object.freeze({ gundam: 251, yugioh: 31515 }),
  selected_set_count: 505,
});

export const COLLECTIBLE_WAVE1_PARENT_GAME_POLICY = Object.freeze({
  gundam: Object.freeze({
    game_id: "47434700-0000-4000-8000-000000000001",
    gv_prefix: "GV-GCG",
    identity_domain: "gundam_eng_parent",
    source_key: "gundam_gcg_api_v1",
  }),
  yugioh: Object.freeze({
    game_id: "59474f00-0000-4000-8000-000000000001",
    gv_prefix: "GV-YGO",
    identity_domain: "yugioh_eng_parent",
    source_key: "yugioh_ygoprodeck_api_v7",
  }),
});

const INPUT_PROPOSAL_VERSION = "COLLECTIBLE_WAVE1_CARD_IDENTITY_PROPOSAL_V1";
const EXISTING_IDENTITY_DOMAINS = Object.freeze([
  "pokemon_eng_standard",
  "pokemon_ba",
  "pokemon_eng_special_print",
  "pokemon_jpn",
  "mtg_eng_paper_print",
  "one_piece_eng_print",
]);

function clean(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function cleanLower(value) {
  return clean(value).toLocaleLowerCase("en-US");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

export function stableJsonWave1ParentApplyV1(value) {
  return JSON.stringify(stable(value));
}

export function wave1ParentApplyFingerprintV1(value) {
  return crypto.createHash("sha256")
    .update(stableJsonWave1ParentApplyV1(value))
    .digest("hex");
}

function uuid(name) {
  return uuidV5(name, COLLECTIBLE_WAVE1_PARENT_UUID_NAMESPACE);
}

function assertHash(value, label) {
  if (!/^[0-9a-f]{64}$/.test(clean(value))) throw new Error(`Invalid ${label}`);
}

function assertUuid(value, label) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(clean(value))) throw new Error(`Invalid ${label}`);
}

function countsByGame(rows) {
  return Object.fromEntries(Object.keys(COLLECTIBLE_WAVE1_PARENT_GAME_POLICY)
    .sort().map((game) => [game, rows.filter((row) => row.game === game).length]));
}

function assertExactCounts(actual, expected, label) {
  if (stableJsonWave1ParentApplyV1(actual) !== stableJsonWave1ParentApplyV1(expected)) {
    throw new Error(`${label} does not match the frozen profile`);
  }
}

function gvNumberToken(number) {
  const token = clean(number)
    .replace(/\?/g, "-UNK-")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
  if (!token) throw new Error("Collector number cannot produce a GV-ID token");
  return token;
}

export function canonicalWave1ParentCardIdV1(parentProposalId) {
  const value = clean(parentProposalId);
  if (!/^(?:gundam|yugioh):card-proposal:[0-9a-f]{24}$/.test(value)) {
    throw new Error(`Invalid parent proposal ID: ${value || "missing"}`);
  }
  return uuid(`grookai:collectible-wave1:parent-card:${value}`);
}

export function canonicalWave1ParentGvIdV1(parent) {
  const game = cleanLower(parent?.game);
  const policy = COLLECTIBLE_WAVE1_PARENT_GAME_POLICY[game];
  if (!policy) throw new Error(`Unsupported Wave 1 game: ${game || "missing"}`);
  const proposalId = clean(parent?.parent_proposal_id);
  canonicalWave1ParentCardIdV1(proposalId);
  const digest = proposalId.slice(-10).toUpperCase();
  return `${policy.gv_prefix}-${gvNumberToken(parent.collector_number)}-${digest}`;
}

function validateParent(parent) {
  const game = cleanLower(parent?.game);
  const policy = COLLECTIBLE_WAVE1_PARENT_GAME_POLICY[game];
  if (!policy || parent?.proposal_version !== INPUT_PROPOSAL_VERSION ||
      parent?.proposal_status !== "proposal_ready" ||
      parent?.canonical_authority !== false || parent?.write_authority !== false ||
      parent?.image_authority !== false || parent?.printing_authority !== false ||
      parent?.alternative_artwork_evidence_count !== 0 ||
      parent?.alternative_artwork_evidence_ids?.length !== 0 ||
      cleanLower(parent?.language) !== "en" || !clean(parent?.card_name) ||
      !clean(parent?.collector_number) || !clean(parent?.normalized_card_name) ||
      !clean(parent?.normalized_collector_number) ||
      !Number.isInteger(parent?.source_printing_candidate_count) ||
      parent.source_printing_candidate_count < 1 ||
      parent?.source_printing_candidate_ids?.length !==
        parent.source_printing_candidate_count ||
      new Set(parent.source_printing_candidate_ids).size !==
        parent.source_printing_candidate_ids.length) {
    throw new Error(`Invalid proposal-ready parent: ${parent?.parent_proposal_id ?? "missing"}`);
  }
  canonicalWave1ParentCardIdV1(parent.parent_proposal_id);
  assertUuid(parent.set_id, "parent set ID");
  for (const hash of parent.source_evidence_sha256 ?? []) assertHash(hash, "source hash");
  return { game, policy };
}

function parentPayload(parent) {
  const { game, policy } = validateParent(parent);
  const cardPrintId = canonicalWave1ParentCardIdV1(parent.parent_proposal_id);
  const normalizedName = cleanLower(parent.normalized_card_name);
  const numberPlain = clean(parent.normalized_collector_number).toUpperCase();
  const identityPayload = {
    game_code: game,
    language_code: "en",
    identity_grain: "canonical_parent_card",
    canonical_set_id: parent.set_id,
    canonical_set_code: parent.canonical_set_code,
    source_set_code: parent.source_set_code,
    printed_number: parent.collector_number,
    normalized_printed_name: normalizedName,
    parent_proposal_id: parent.parent_proposal_id,
    variant_key: null,
    rarity: null,
  };
  const identityHash = wave1ParentApplyFingerprintV1(identityPayload);
  const identityId = uuid(
    `grookai:collectible-wave1:parent-identity:${parent.parent_proposal_id}:${identityHash}`,
  );
  return {
    parent_proposal_id: parent.parent_proposal_id,
    game,
    source_printing_candidate_ids: [...parent.source_printing_candidate_ids].sort(),
    card_print: {
      id: cardPrintId,
      game_id: policy.game_id,
      set_id: parent.set_id,
      name: clean(parent.card_name),
      number: clean(parent.collector_number),
      number_plain: numberPlain,
      variant_key: null,
      rarity: null,
      image_url: null,
      image_alt_url: null,
      image_source: null,
      image_status: "missing",
      tcgplayer_id: null,
      external_ids: {},
      set_code: clean(parent.canonical_set_code),
      gv_id: canonicalWave1ParentGvIdV1(parent),
      identity_domain: policy.identity_domain,
      print_identity_key: `${policy.identity_domain}:${identityHash}`,
      printed_identity_modifier: null,
      set_identity_model: "standard",
      data_quality_flags: {
        app_visibility: "hidden_by_game_release_control",
        canonical_grain: "parent_card_only",
        child_printings_deferred: true,
        rarity_preserved_as_source_evidence_only: true,
        finish_and_variant_authority_deferred: true,
        image_authority_deferred: true,
      },
      ai_metadata: null,
    },
    identity: {
      id: identityId,
      card_print_id: cardPrintId,
      identity_domain: policy.identity_domain,
      set_code_identity: clean(parent.canonical_set_code),
      printed_number: clean(parent.collector_number),
      normalized_printed_name: normalizedName,
      source_name_raw: clean(parent.card_name),
      identity_payload: identityPayload,
      identity_key_version: COLLECTIBLE_WAVE1_PARENT_IDENTITY_KEY_VERSION,
      identity_key_hash: identityHash,
      is_active: true,
    },
  };
}

function validateEvidence(source, parentById) {
  const parent = parentById.get(clean(source?.parent_proposal_id));
  const game = cleanLower(source?.game);
  const policy = COLLECTIBLE_WAVE1_PARENT_GAME_POLICY[game];
  if (!parent || !policy || source?.proposal_version !== INPUT_PROPOSAL_VERSION ||
      source?.canonical_authority !== false || source?.write_authority !== false ||
      source?.image_authority !== false ||
      source?.evidence_status !== "source_printing_evidence_unmapped" ||
      source?.normalized_finish_key !== null || source?.normalized_variant_key !== null ||
      source?.source_rarity_is_not_finish_authority !== true ||
      source?.canonical_printing_id_proposed !== false ||
      source?.alternative_artwork_evidence_ids?.length !== 0 ||
      !clean(source?.shadow_candidate_id) || !clean(source?.source_candidate_id)) {
    throw new Error(`Invalid selected source evidence: ${source?.shadow_candidate_id ?? "missing"}`);
  }
  assertHash(source.source_evidence_sha256, "source evidence hash");
  if (!parent.source_printing_candidate_ids.includes(source.shadow_candidate_id)) {
    throw new Error(`Source evidence is absent from its parent: ${source.shadow_candidate_id}`);
  }
  return { parent, policy };
}

function evidencePayload(source, parentById) {
  const { parent, policy } = validateEvidence(source, parentById);
  const shadowId = clean(source.shadow_candidate_id);
  const acquisitionKey = `${policy.source_key}:shadow:${wave1ParentApplyFingerprintV1(shadowId)}`;
  const evidenceSubject = {
    parent_proposal_id: parent.parent_proposal_id,
    canonical_set_id: parent.card_print.set_id,
    canonical_set_code: parent.card_print.set_code,
    printed_number: parent.card_print.number,
    printed_name: parent.card_print.name,
    source_printing_candidate_id: shadowId,
    source_candidate_id: clean(source.source_candidate_id),
  };
  const evidenceBody = {
    source_printing_evidence: {
      source_evidence_sha256: source.source_evidence_sha256,
      source_product_id: clean(source.source_product_id) || null,
      source_rarity_label: clean(source.source_rarity_label) || null,
      normalized_finish_key: null,
      normalized_variant_key: null,
      source_rarity_is_not_finish_authority: true,
      canonical_printing_id_proposed: false,
      image_authority: false,
    },
    governing_proposal: {
      version: COLLECTIBLE_WAVE1_PARENT_APPLY_PROPOSAL_VERSION,
      source_proposal_version: INPUT_PROPOSAL_VERSION,
      source_workflow_run_id: COLLECTIBLE_WAVE1_PARENT_INPUT.workflow_run_id,
      source_proposal_fingerprint_sha256:
        COLLECTIBLE_WAVE1_PARENT_INPUT.proposal_fingerprint_sha256,
    },
  };
  const evidenceHash = wave1ParentApplyFingerprintV1({
    acquisition_key: acquisitionKey,
    source_key: policy.source_key,
    evidence_subject: evidenceSubject,
    evidence_payload: evidenceBody,
  });
  return {
    shadow_candidate_id: shadowId,
    game: parent.game,
    source_evidence: {
      id: uuid(`grookai:collectible-wave1:source-evidence:${shadowId}`),
      card_print_identity_id: parent.identity.id,
      card_print_id: parent.card_print.id,
      acquisition_key: acquisitionKey,
      source_key: policy.source_key,
      evidence_key_hash: evidenceHash,
      evidence_subject: evidenceSubject,
      evidence_payload: evidenceBody,
      active: true,
    },
  };
}

function assertUnique(rows, field, label = field) {
  const seen = new Set();
  for (const row of rows) {
    const value = row[field];
    if (seen.has(value)) throw new Error(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

export function buildCollectibleWave1ParentApplyProposalV1({
  parentProposals,
  sourcePrintingEvidence,
}) {
  if (!Array.isArray(parentProposals) ||
      parentProposals.length !== COLLECTIBLE_WAVE1_PARENT_EXPECTED.input_parent_count) {
    throw new Error("Parent proposal input does not match the frozen row count");
  }
  if (!Array.isArray(sourcePrintingEvidence) || sourcePrintingEvidence.length !==
      COLLECTIBLE_WAVE1_PARENT_EXPECTED.source_printing_evidence_count) {
    throw new Error("Source evidence input does not match the frozen row count");
  }
  const ready = parentProposals.filter((row) => row.proposal_status === "proposal_ready")
    .sort((left, right) => left.parent_proposal_id.localeCompare(right.parent_proposal_id));
  const review = parentProposals.filter((row) => row.proposal_status !== "proposal_ready");
  if (ready.length !== COLLECTIBLE_WAVE1_PARENT_EXPECTED.proposal_ready_parent_count ||
      review.length !== COLLECTIBLE_WAVE1_PARENT_EXPECTED.review_required_parent_count) {
    throw new Error("Parent proposal partition does not match the frozen profile");
  }
  assertExactCounts(
    countsByGame(ready),
    COLLECTIBLE_WAVE1_PARENT_EXPECTED.parent_counts_by_game,
    "Parent game partition",
  );

  const parents = ready.map(parentPayload);
  const parentById = new Map(parents.map((row) => [row.parent_proposal_id, row]));
  const selectedEvidence = sourcePrintingEvidence
    .filter((row) => parentById.has(clean(row.parent_proposal_id)))
    .sort((left, right) => left.shadow_candidate_id.localeCompare(right.shadow_candidate_id));
  if (selectedEvidence.length !==
      COLLECTIBLE_WAVE1_PARENT_EXPECTED.selected_source_evidence_count) {
    throw new Error("Selected source evidence count does not match the frozen profile");
  }
  assertExactCounts(
    countsByGame(selectedEvidence),
    COLLECTIBLE_WAVE1_PARENT_EXPECTED.evidence_counts_by_game,
    "Evidence game partition",
  );
  const evidence = selectedEvidence.map((row) => evidencePayload(row, parentById));

  const sourceReferences = new Set(selectedEvidence.map((row) => row.shadow_candidate_id));
  const expectedReferences = new Set(parents.flatMap((row) => row.source_printing_candidate_ids));
  if (sourceReferences.size !== selectedEvidence.length ||
      expectedReferences.size !== selectedEvidence.length ||
      [...expectedReferences].some((id) => !sourceReferences.has(id))) {
    throw new Error("Parent-to-source evidence reconciliation is incomplete");
  }

  const cardPrints = parents.map((row) => row.card_print);
  const identities = parents.map((row) => row.identity);
  const sourceEvidenceRows = evidence.map((row) => row.source_evidence);
  for (const [rows, fields] of [
    [cardPrints, ["id", "gv_id", "print_identity_key"]],
    [identities, ["id", "card_print_id", "identity_key_hash"]],
    [sourceEvidenceRows, ["id", "acquisition_key", "evidence_key_hash"]],
  ]) for (const field of fields) assertUnique(rows, field);

  const setCoordinates = cardPrints.map((row) =>
    `${row.set_id}\u0000${row.number_plain}\u0000${row.variant_key ?? ""}`);
  if (new Set(setCoordinates).size !== setCoordinates.length) {
    throw new Error("Proposed standard-set parent coordinates collide");
  }
  if (cardPrints.some((row) => row.variant_key !== null || row.rarity !== null ||
      row.tcgplayer_id !== null || Object.keys(row.external_ids).length !== 0)) {
    throw new Error("Parent payload promoted printing-only authority");
  }

  const fingerprintPayload = {
    version: COLLECTIBLE_WAVE1_PARENT_APPLY_PROPOSAL_VERSION,
    source_input: COLLECTIBLE_WAVE1_PARENT_INPUT,
    card_prints: cardPrints,
    identities,
    source_evidence: sourceEvidenceRows,
  };
  return {
    version: COLLECTIBLE_WAVE1_PARENT_APPLY_PROPOSAL_VERSION,
    status: "candidate_only_not_authorized",
    cardPrints,
    identities,
    sourceEvidence: sourceEvidenceRows,
    payload_fingerprint_sha256: wave1ParentApplyFingerprintV1(fingerprintPayload),
    metrics: {
      card_print_count: cardPrints.length,
      identity_count: identities.length,
      source_evidence_count: sourceEvidenceRows.length,
      parent_counts_by_game: countsByGame(parents),
      evidence_counts_by_game: countsByGame(evidence),
      review_required_rows_excluded: review.length,
      reconciliation_mismatch_count: 0,
    },
    boundaries: {
      durable_database_writes_authorized: false,
      migration_ledger_writes_authorized: false,
      review_required_rows_included: false,
      child_printing_writes: false,
      mapping_writes: false,
      storage_writes: false,
      image_pointer_writes: false,
      pricing_writes: false,
      publication_writes: false,
      vault_writes: false,
      app_visibility_enabled: false,
    },
  };
}

function dollarJson(tag, rows) {
  const json = JSON.stringify(rows);
  const delimiter = `$${tag}$`;
  if (json.includes(delimiter)) throw new Error(`SQL payload contains ${delimiter}`);
  return `${delimiter}${json}${delimiter}::jsonb`;
}

export function renderCollectibleWave1ParentMigrationCandidateV1(proposal) {
  if (proposal?.version !== COLLECTIBLE_WAVE1_PARENT_APPLY_PROPOSAL_VERSION ||
      proposal?.cardPrints?.length !==
        COLLECTIBLE_WAVE1_PARENT_EXPECTED.proposal_ready_parent_count ||
      proposal?.identities?.length !==
        COLLECTIBLE_WAVE1_PARENT_EXPECTED.proposal_ready_parent_count ||
      proposal?.sourceEvidence?.length !==
        COLLECTIBLE_WAVE1_PARENT_EXPECTED.selected_source_evidence_count) {
    throw new Error("Migration rendering requires the exact governed parent payload");
  }
  const domainValues = [
    ...EXISTING_IDENTITY_DOMAINS,
    ...Object.values(COLLECTIBLE_WAVE1_PARENT_GAME_POLICY)
      .map((row) => row.identity_domain),
  ];
  const domainsSql = domainValues.map((value) => `'${value}'::text`).join(",\n        ");
  const cardJson = dollarJson("wave1_cards_v1", proposal.cardPrints);
  const identityJson = dollarJson("wave1_identities_v1", proposal.identities);
  const evidenceJson = dollarJson("wave1_evidence_v1", proposal.sourceEvidence);
  return `-- ${COLLECTIBLE_WAVE1_PARENT_APPLY_PROPOSAL_VERSION}\n` +
    `-- Candidate only. Payload fingerprint: ${proposal.payload_fingerprint_sha256}\n` +
    `-- No execution authority is conveyed by this file.\n\n` +
    `begin;\n\nset local lock_timeout = '5s';\n` +
    `set local statement_timeout = '300s';\n\n` +
    `do $$\ndeclare current_constraint text;\n` +
    `  current_domain_count integer;\nbegin\n` +
    `  select pg_get_constraintdef(oid) into current_constraint\n` +
    `  from pg_constraint where conrelid='public.card_print_identity'::regclass\n` +
    `    and conname='card_print_identity_identity_domain_check';\n` +
    `  select count(*) into current_domain_count\n` +
    `  from regexp_matches(coalesce(current_constraint,''), '''[^'']+''::text', 'g');\n` +
    `  if current_constraint is null\n` +
    `    or current_domain_count<>6\n` +
    EXISTING_IDENTITY_DOMAINS.map((domain) =>
      `    or position('${domain}' in current_constraint)=0\n`).join("") +
    `    or position('yugioh_eng_parent' in current_constraint)>0\n` +
    `    or position('gundam_eng_parent' in current_constraint)>0 then\n` +
    `    raise exception 'Wave 1 identity-domain constraint precondition failed';\n` +
    `  end if;\nend;\n$$;\n\n` +
    `alter table public.card_print_identity\n` +
    `  drop constraint card_print_identity_identity_domain_check;\n` +
    `alter table public.card_print_identity\n` +
    `  add constraint card_print_identity_identity_domain_check\n` +
    `  check (identity_domain = any (array[\n        ${domainsSql}\n      ]));\n` +
    `comment on constraint card_print_identity_identity_domain_check\n` +
    `  on public.card_print_identity is\n` +
    `  'Versioned canonical identity domains, including hidden English Yu-Gi-Oh and Gundam parent identity.';\n\n` +
    `insert into public.card_prints (\n` +
    `  id,game_id,set_id,name,number,number_plain,variant_key,rarity,image_url,\n` +
    `  image_alt_url,image_source,image_status,tcgplayer_id,external_ids,set_code,\n` +
    `  gv_id,identity_domain,print_identity_key,printed_identity_modifier,\n` +
    `  set_identity_model,data_quality_flags,ai_metadata\n` +
    `) select row.id,row.game_id,row.set_id,row.name,row.number,row.number_plain,\n` +
    `  row.variant_key,row.rarity,row.image_url,row.image_alt_url,row.image_source,\n` +
    `  row.image_status,row.tcgplayer_id,row.external_ids,row.set_code,row.gv_id,\n` +
    `  row.identity_domain,row.print_identity_key,row.printed_identity_modifier,\n` +
    `  row.set_identity_model,row.data_quality_flags,row.ai_metadata\n` +
    `from jsonb_to_recordset(${cardJson}) as row(\n` +
    `  id uuid,game_id uuid,set_id uuid,name text,number text,number_plain text,\n` +
    `  variant_key text,rarity text,image_url text,image_alt_url text,image_source text,\n` +
    `  image_status text,tcgplayer_id text,external_ids jsonb,set_code text,gv_id text,\n` +
    `  identity_domain text,print_identity_key text,printed_identity_modifier text,\n` +
    `  set_identity_model text,data_quality_flags jsonb,ai_metadata jsonb\n` +
    `);\n\n` +
    `insert into public.card_print_identity (\n` +
    `  id,card_print_id,identity_domain,set_code_identity,printed_number,\n` +
    `  normalized_printed_name,source_name_raw,identity_payload,identity_key_version,\n` +
    `  identity_key_hash,is_active\n` +
    `) select row.id,row.card_print_id,row.identity_domain,row.set_code_identity,\n` +
    `  row.printed_number,row.normalized_printed_name,row.source_name_raw,\n` +
    `  row.identity_payload,row.identity_key_version,row.identity_key_hash,row.is_active\n` +
    `from jsonb_to_recordset(${identityJson}) as row(\n` +
    `  id uuid,card_print_id uuid,identity_domain text,set_code_identity text,\n` +
    `  printed_number text,normalized_printed_name text,source_name_raw text,\n` +
    `  identity_payload jsonb,identity_key_version text,identity_key_hash text,is_active boolean\n` +
    `);\n\n` +
    `insert into public.card_print_identity_source_evidence (\n` +
    `  id,card_print_identity_id,card_print_id,acquisition_key,source_key,\n` +
    `  evidence_key_hash,evidence_subject,evidence_payload,active\n` +
    `) select row.id,row.card_print_identity_id,row.card_print_id,row.acquisition_key,\n` +
    `  row.source_key,row.evidence_key_hash,row.evidence_subject,row.evidence_payload,row.active\n` +
    `from jsonb_to_recordset(${evidenceJson}) as row(\n` +
    `  id uuid,card_print_identity_id uuid,card_print_id uuid,acquisition_key text,\n` +
    `  source_key text,evidence_key_hash text,evidence_subject jsonb,\n` +
    `  evidence_payload jsonb,active boolean\n` +
    `);\n\ncommit;\n`;
}

export function buildCollectibleWave1ParentRollbackContractV1(proposal) {
  if (proposal?.cardPrints?.length !==
      COLLECTIBLE_WAVE1_PARENT_EXPECTED.proposal_ready_parent_count ||
      proposal?.identities?.length !==
        COLLECTIBLE_WAVE1_PARENT_EXPECTED.proposal_ready_parent_count ||
      proposal?.sourceEvidence?.length !==
        COLLECTIBLE_WAVE1_PARENT_EXPECTED.selected_source_evidence_count) {
    throw new Error("Rollback contract requires the exact governed parent payload");
  }
  return {
    version: "COLLECTIBLE_WAVE1_PARENT_ROLLBACK_CONTRACT_V1",
    status: "candidate_only_not_authorized",
    selector: {
      exact_card_print_ids: proposal.cardPrints.map((row) => row.id).sort(),
      exact_identity_ids: proposal.identities.map((row) => row.id).sort(),
      exact_source_evidence_ids: proposal.sourceEvidence.map((row) => row.id).sort(),
      exact_payload_fingerprint_sha256: proposal.payload_fingerprint_sha256,
    },
    preconditions: [
      "every selected row still matches the exact immutable proposal payload",
      "no selected row has gained child printing, mapping, image, pricing, publication, or Vault dependencies",
      "the exact parent migration ledger row is the only authorized migration deletion",
      "a separate rollback execution is explicitly authorized",
    ],
    behavior: "delete exact evidence, identity, and parent IDs only in one transaction, then restore the prior identity-domain constraint and prove absence",
    automatic_execution_authorized: false,
    forward_fix_required_if_referenced: true,
  };
}

export function evaluateCollectibleWave1ParentPreflightV1(readback) {
  const findings = [];
  if (readback?.transaction_read_only !== true) findings.push("transaction_not_read_only");
  for (const field of [
    "existing_card_print_id_count",
    "existing_gv_id_count",
    "existing_standard_coordinate_count",
    "existing_identity_id_count",
    "existing_identity_hash_count",
    "existing_evidence_id_count",
    "existing_evidence_lane_count",
    "existing_target_set_card_count",
    "candidate_migration_count",
    "conflicting_lock_count",
  ]) if (Number(readback?.[field] ?? 0) !== 0) findings.push(`${field}_not_zero`);
  if (Number(readback?.planned_card_print_count ?? 0) !==
      COLLECTIBLE_WAVE1_PARENT_EXPECTED.proposal_ready_parent_count) {
    findings.push("planned_card_print_count_mismatch");
  }
  if (Number(readback?.planned_identity_count ?? 0) !==
      COLLECTIBLE_WAVE1_PARENT_EXPECTED.proposal_ready_parent_count) {
    findings.push("planned_identity_count_mismatch");
  }
  if (Number(readback?.planned_evidence_count ?? 0) !==
      COLLECTIBLE_WAVE1_PARENT_EXPECTED.selected_source_evidence_count) {
    findings.push("planned_evidence_count_mismatch");
  }
  const constraint = clean(readback?.identity_domain_constraint);
  for (const domain of EXISTING_IDENTITY_DOMAINS) {
    if (!constraint.includes(domain)) findings.push(`existing_identity_domain_missing:${domain}`);
  }
  for (const policy of Object.values(COLLECTIBLE_WAVE1_PARENT_GAME_POLICY)) {
    if (constraint.includes(policy.identity_domain)) {
      findings.push(`target_identity_domain_already_present:${policy.identity_domain}`);
    }
  }
  const observedDomains = [...constraint.matchAll(/'([^']+)'::text/g)]
    .map((match) => match[1]).sort();
  if (observedDomains.length > 0 && stableJsonWave1ParentApplyV1(observedDomains) !==
      stableJsonWave1ParentApplyV1([...EXISTING_IDENTITY_DOMAINS].sort())) {
    findings.push("identity_domain_constraint_exact_set_mismatch");
  }
  const expectedGames = Object.entries(COLLECTIBLE_WAVE1_PARENT_GAME_POLICY)
    .map(([code, policy]) => ({
      id: policy.game_id,
      code,
      name: code === "gundam" ? "Gundam Card Game" : "Yu-Gi-Oh!",
      slug: code === "gundam" ? "gundam-card-game" : "yu-gi-oh",
    })).sort((left, right) => left.code.localeCompare(right.code));
  const actualGames = [...(readback?.games ?? [])].map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    slug: row.slug,
  })).sort((left, right) => String(left.code).localeCompare(String(right.code)));
  if (stableJsonWave1ParentApplyV1(actualGames) !==
      stableJsonWave1ParentApplyV1(expectedGames)) {
    findings.push("game_foundations_mismatch");
  }
  for (const game of Object.keys(COLLECTIBLE_WAVE1_PARENT_GAME_POLICY)) {
    const control = readback?.release_controls?.find((row) => row.game_code === game);
    if (!control || control.release_status !== "hidden" ||
        control.release_version !== "COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1") {
      findings.push(`hidden_release_control_mismatch:${game}`);
    }
  }
  if (Number(readback?.selected_set_count ?? 0) !==
      COLLECTIBLE_WAVE1_PARENT_EXPECTED.selected_set_count) {
    findings.push("selected_set_count_mismatch");
  }
  return [...new Set(findings)].sort();
}
