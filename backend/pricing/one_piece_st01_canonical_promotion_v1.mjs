import {
  deterministicUuidV5,
  sha256,
  stableJson,
} from "./one_piece_canonical_import_staging_v1.mjs";
import {
  ONE_PIECE_ST01_CARD_LIST_URL,
  ONE_PIECE_ST01_PRODUCT_URL,
  ST01_OFFICIAL_CARDS,
} from "./one_piece_st01_language_and_image_readiness_v1.mjs";

export const ONE_PIECE_ST01_PROMOTION_PLAN_VERSION =
  "ONE_PIECE_ST01_CANONICAL_PARENT_PROMOTION_PLAN_V1";
export const ONE_PIECE_ST01_IDENTITY_DOMAIN = "one_piece_eng_print";
export const ONE_PIECE_ST01_IDENTITY_KEY_VERSION =
  "ONE_PIECE_ENG_PRINT_IDENTITY_V1";
export const ONE_PIECE_GAME_ID = "4f504300-0000-4000-8000-000000000001";
export const ONE_PIECE_GAME_CODE = "one_piece";
export const ONE_PIECE_ST01_SET_CODE = "ST01";
export const ONE_PIECE_ST01_SET_ID = "0c200843-98c2-5274-aa48-c914c73e66a7";
export const ONE_PIECE_ST01_UUID_NAMESPACE =
  "5c789c08-b9e8-50d7-a3d8-6aeeecdd8a65";

export const ONE_PIECE_ST01_PINNED_INPUTS = Object.freeze({
  staged_readback_sha256:
    "ffd53870da7602ad8e3ca703c343696bf3510d64a7caf70270f9f44d7e67dc18",
  readiness_rows_sha256:
    "6fd5b77b764bf1a8400bc02f271781499321759b6a45d108e5f18571c7555c89",
  storage_readback_rows_sha256:
    "8aa7e0a573e8efe3ae48415670b971d09ee27c37a78e6eff330f7486e4370f3d",
  foundation_summary_sha256:
    "a045fb5bb624262a5a432f5a47ec74f397d652191946a9d766c8dd6bc2b8fa89",
});

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeName(value) {
  return clean(value).toLowerCase().replace(/\s+/g, " ");
}

function rowMap(rows, key) {
  return new Map(rows.map((row) => [String(row[key]), row]));
}

function targetIds(cardNumber, productId, identityHash) {
  const cardPrintId = deterministicUuidV5(
    `one-piece:st01:card:${cardNumber}`,
    ONE_PIECE_ST01_UUID_NAMESPACE,
  );
  return {
    card_print_id: cardPrintId,
    identity_id: deterministicUuidV5(
      `one-piece:st01:identity:${identityHash}`,
      ONE_PIECE_ST01_UUID_NAMESPACE,
    ),
    evidence_id: deterministicUuidV5(
      `one-piece:st01:evidence:tcgplayer:${productId}`,
      ONE_PIECE_ST01_UUID_NAMESPACE,
    ),
  };
}

function buildIdentityPayload(cardNumber, officialName) {
  return {
    game_code: ONE_PIECE_GAME_CODE,
    language_code: "en",
    set_code: ONE_PIECE_ST01_SET_CODE,
    printed_number: cardNumber,
    normalized_printed_name: normalizeName(officialName),
    variant_key: "base",
  };
}

function buildSetRow() {
  return {
    id: ONE_PIECE_ST01_SET_ID,
    game: ONE_PIECE_GAME_CODE,
    code: ONE_PIECE_ST01_SET_CODE,
    name: "Starter Deck -Straw Hat Crew- [ST-01]",
    release_date: "2022-12-02",
    identity_domain_default: ONE_PIECE_ST01_IDENTITY_DOMAIN,
    source: {
      canonical_authority: "official_one_piece_card_game",
      official_product_url: ONE_PIECE_ST01_PRODUCT_URL,
      official_card_list_url: ONE_PIECE_ST01_CARD_LIST_URL,
      tcgplayer_group_id: 3189,
      visibility_authority: "catalog_game_release_controls:hidden",
    },
  };
}

export function buildOnePieceSt01PromotionPlanV1({
  repository,
  inputHashes,
  stagedReadback,
  readinessRows,
  storageRows,
  foundationSummary,
}) {
  if (stableJson(inputHashes) !== stableJson(ONE_PIECE_ST01_PINNED_INPUTS)) {
    throw new Error("Pinned ST-01 evidence inputs changed");
  }
  if (foundationSummary?.status !==
      "foundation_post_apply_independently_verified" ||
      foundationSummary?.readback?.release_control_row?.release_status !== "hidden" ||
      Number(foundationSummary?.readback?.card_count) !== 0) {
    throw new Error("One Piece hidden foundation proof is not eligible");
  }

  const durableRows = (stagedReadback?.rows?.rows ?? []).filter(
    (row) => row.record_class === "exact_single_card_candidate" &&
      row.single_card_kind === "numbered_card" &&
      Number(row.source_group_id) === 3189,
  );
  const readiness = readinessRows.filter(
    (row) => row.review_lane === "numbered_card_parent_identity_review",
  );
  const storage = storageRows.filter((row) =>
    /^ST01-\d{3}$/.test(
      readiness.find((item) =>
        Number(item.source_product_id) === Number(row.source_product_id))?.card_number ?? "",
    ));
  if (durableRows.length !== 17 || readiness.length !== 17 || storage.length !== 17) {
    throw new Error("ST-01 evidence lanes must each contain exactly 17 numbered cards");
  }

  const readinessByProduct = rowMap(readiness, "source_product_id");
  const storageByProduct = rowMap(storage, "source_product_id");
  const durableByNumber = new Map(durableRows.map((row) => [
    row.payload?.card_evidence?.number,
    row,
  ]));
  const rows = [];
  for (const [cardNumber, expectedName] of ST01_OFFICIAL_CARDS) {
    const staged = durableByNumber.get(cardNumber);
    const productId = Number(staged?.source_product_id);
    const ready = readinessByProduct.get(String(productId));
    const image = storageByProduct.get(String(productId));
    const officialName = ready?.language_authority?.official_card_name;
    if (!staged || !ready || !image || officialName !== expectedName ||
        ready.language_authority?.authority_status !==
          "exact_official_english_st01_card_match" ||
        image.verified !== true) {
      throw new Error(`Incomplete exact evidence for ${cardNumber}`);
    }
    const identityPayload = buildIdentityPayload(cardNumber, officialName);
    const identityHash = sha256(stableJson(identityPayload));
    const ids = targetIds(cardNumber, productId, identityHash);
    const acquisitionKey = `one_piece:tcgplayer:product:${productId}`;
    const evidenceSubject = {
      identity_domain: ONE_PIECE_ST01_IDENTITY_DOMAIN,
      set_code: ONE_PIECE_ST01_SET_CODE,
      printed_number: cardNumber,
      printed_name: officialName,
    };
    const evidencePayload = {
      durable_staging: {
        batch_id: staged.batch_id,
        staging_row_id: staged.id,
        payload_sha256: staged.payload_sha256,
        source_group_id: Number(staged.source_group_id),
        source_product_id: productId,
      },
      official_authority: {
        language_code: "en",
        authority_status: ready.language_authority.authority_status,
        product_url: ONE_PIECE_ST01_PRODUCT_URL,
        card_list_url: ONE_PIECE_ST01_CARD_LIST_URL,
      },
      self_hosted_image_evidence: {
        storage_path: image.target_storage_path,
        sha256: image.expected.sha256,
        size_bytes: Number(image.expected.size_bytes),
        width: Number(image.expected.width),
        height: Number(image.expected.height),
        format: image.expected.format,
        independently_verified: true,
        pointer_authorized: false,
      },
      source_card_facts: {
        card_type: staged.payload?.card_evidence?.card_type,
        rarity: staged.payload?.card_evidence?.rarity,
      },
    };
    const evidenceHash = sha256(stableJson({
      acquisition_key: acquisitionKey,
      source_key: "tcgplayer",
      evidence_subject: evidenceSubject,
      evidence_payload: evidencePayload,
    }));
    const parentGvId = staged.payload?.parent_gv_id;
    rows.push({
      card_number: cardNumber,
      source_product_id: productId,
      staging_row_id: staged.id,
      staging_payload_sha256: staged.payload_sha256,
      image_storage_path: image.target_storage_path,
      image_sha256: image.expected.sha256,
      card_print: {
        id: ids.card_print_id,
        game_id: ONE_PIECE_GAME_ID,
        set_id: ONE_PIECE_ST01_SET_ID,
        set_code: ONE_PIECE_ST01_SET_CODE,
        name: officialName,
        number: cardNumber,
        variant_key: "",
        rarity: staged.payload?.card_evidence?.rarity ?? null,
        gv_id: parentGvId,
        tcgplayer_id: String(productId),
        external_ids: { tcgplayer: String(productId) },
        identity_domain: ONE_PIECE_ST01_IDENTITY_DOMAIN,
        print_identity_key:
          `${ONE_PIECE_ST01_IDENTITY_DOMAIN}:${identityHash}`,
        image_url: null,
        image_alt_url: null,
        data_quality_flags: {
          app_visibility: "hidden_by_game_release_control",
          exact_printing_children_deferred: true,
          image_pointer_deferred: true,
        },
        ai_metadata: {
          source_card_type: staged.payload?.card_evidence?.card_type ?? null,
          canonical_authority: "official_english_st01_card_list",
          durable_staging_row_id: staged.id,
        },
      },
      identity: {
        id: ids.identity_id,
        card_print_id: ids.card_print_id,
        identity_domain: ONE_PIECE_ST01_IDENTITY_DOMAIN,
        set_code_identity: ONE_PIECE_ST01_SET_CODE,
        printed_number: cardNumber,
        normalized_printed_name: normalizeName(officialName),
        source_name_raw: officialName,
        identity_payload: identityPayload,
        identity_key_version: ONE_PIECE_ST01_IDENTITY_KEY_VERSION,
        identity_key_hash: identityHash,
        is_active: true,
      },
      source_evidence: {
        id: ids.evidence_id,
        card_print_identity_id: ids.identity_id,
        card_print_id: ids.card_print_id,
        acquisition_key: acquisitionKey,
        source_key: "tcgplayer",
        evidence_key_hash: evidenceHash,
        evidence_subject: evidenceSubject,
        evidence_payload: evidencePayload,
        active: true,
      },
      external_mapping: {
        card_print_id: ids.card_print_id,
        source: "tcgplayer",
        external_id: String(productId),
        meta: {
          source_group_id: 3189,
          staging_row_id: staged.id,
          mapping_authority: "exact_durable_source_product",
          promotion_plan_version: ONE_PIECE_ST01_PROMOTION_PLAN_VERSION,
        },
        active: true,
      },
    });
  }

  const payload = {
    set_row: buildSetRow(),
    numbered_cards: rows,
  };
  const payloadFingerprint = sha256(stableJson(payload));
  const boundaries = {
    rollback_only_canary_authorized: true,
    durable_database_writes: false,
    card_printing_child_writes: false,
    don_writes: false,
    sealed_writes: false,
    storage_writes: false,
    image_pointer_writes: false,
    pricing_writes: false,
    publication_writes: false,
    vault_writes: false,
    app_visibility_enabled: false,
  };
  const core = {
    version: ONE_PIECE_ST01_PROMOTION_PLAN_VERSION,
    repository,
    input_hashes: inputHashes,
    payload_fingerprint_sha256: payloadFingerprint,
    counts: {
      sets: 1,
      card_prints: 17,
      card_print_identity: 17,
      card_print_identity_source_evidence: 17,
      external_mappings: 17,
    },
    payload,
    boundaries,
  };
  return {
    ...core,
    plan_fingerprint_sha256: sha256(stableJson(core)),
  };
}

export function validateOnePieceSt01PromotionPlanV1(plan) {
  const findings = [];
  const add = (condition, code) => {
    if (condition) findings.push(code);
  };
  const { plan_fingerprint_sha256: ignored, ...core } = plan ?? {};
  add(plan?.version !== ONE_PIECE_ST01_PROMOTION_PLAN_VERSION,
    "plan_version_mismatch");
  add(plan?.plan_fingerprint_sha256 !== sha256(stableJson(core)),
    "plan_fingerprint_mismatch");
  add(stableJson(plan?.input_hashes) !== stableJson(ONE_PIECE_ST01_PINNED_INPUTS),
    "input_hashes_mismatch");
  add(plan?.payload_fingerprint_sha256 !== sha256(stableJson(plan?.payload)),
    "payload_fingerprint_mismatch");
  add(stableJson(plan?.counts) !== stableJson({
    sets: 1, card_prints: 17, card_print_identity: 17,
    card_print_identity_source_evidence: 17, external_mappings: 17,
  }), "count_contract_mismatch");
  const rows = plan?.payload?.numbered_cards ?? [];
  add(rows.length !== 17, "numbered_card_count_mismatch");
  add(plan?.payload?.set_row?.id !== ONE_PIECE_ST01_SET_ID ||
    plan?.payload?.set_row?.id !== deterministicUuidV5(
      "one-piece:canonical:set:st01", ONE_PIECE_ST01_UUID_NAMESPACE) ||
    plan?.payload?.set_row?.game !== ONE_PIECE_GAME_CODE ||
    plan?.payload?.set_row?.code !== ONE_PIECE_ST01_SET_CODE,
  "set_identity_mismatch");
  for (const key of ["durable_database_writes", "card_printing_child_writes",
    "don_writes", "sealed_writes", "storage_writes", "image_pointer_writes",
    "pricing_writes", "publication_writes", "vault_writes",
    "app_visibility_enabled"]) {
    add(plan?.boundaries?.[key] !== false, `boundary_open:${key}`);
  }
  add(plan?.boundaries?.rollback_only_canary_authorized !== true,
    "rollback_canary_not_authorized");
  const official = new Map(ST01_OFFICIAL_CARDS);
  for (const row of rows) {
    const prefix = row.card_number ?? "unknown";
    add(official.get(prefix) !== row.card_print?.name,
      `official_identity_mismatch:${prefix}`);
    add(row.card_print?.id !== row.identity?.card_print_id ||
      row.card_print?.id !== row.source_evidence?.card_print_id ||
      row.identity?.id !== row.source_evidence?.card_print_identity_id,
    `reference_mismatch:${prefix}`);
    add(row.identity?.identity_domain !== ONE_PIECE_ST01_IDENTITY_DOMAIN ||
      row.card_print?.identity_domain !== ONE_PIECE_ST01_IDENTITY_DOMAIN,
    `identity_domain_mismatch:${prefix}`);
    add(row.identity?.identity_key_hash !==
      sha256(stableJson(row.identity?.identity_payload)),
    `identity_hash_mismatch:${prefix}`);
    add(row.card_print?.image_url !== null ||
      row.card_print?.image_alt_url !== null,
    `image_pointer_present:${prefix}`);
    add(row.source_evidence?.evidence_payload?.self_hosted_image_evidence
      ?.pointer_authorized !== false,
    `image_pointer_authority_open:${prefix}`);
    add(row.external_mapping?.external_id !== String(row.source_product_id) ||
      row.external_mapping?.card_print_id !== row.card_print?.id,
    `mapping_reference_mismatch:${prefix}`);
    add(row.card_number === null || !/^ST01-\d{3}$/.test(row.card_number),
      `non_numbered_card:${prefix}`);
  }
  for (const [field, values] of Object.entries({
    card_print_id: rows.map((row) => row.card_print?.id),
    gv_id: rows.map((row) => row.card_print?.gv_id),
    identity_id: rows.map((row) => row.identity?.id),
    identity_hash: rows.map((row) => row.identity?.identity_key_hash),
    evidence_id: rows.map((row) => row.source_evidence?.id),
    product_id: rows.map((row) => row.source_product_id),
    card_number: rows.map((row) => row.card_number),
  })) {
    add(values.some((value) => value === null || value === undefined || value === ""),
      `missing_unique_value:${field}`);
    add(new Set(values.map(String)).size !== 17, `duplicate_value:${field}`);
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function expectedOnePieceSt01AttributableWritesV1() {
  return {
    sets: 1,
    card_prints: 17,
    card_print_identity: 17,
    card_print_identity_source_evidence: 17,
    external_mappings: 17,
  };
}

export const ONE_PIECE_ST01_PREFLIGHT_VERSION =
  "ONE_PIECE_ST01_CANONICAL_PROMOTION_PREFLIGHT_V1";
export const ONE_PIECE_ST01_ROLLBACK_CANARY_VERSION =
  "ONE_PIECE_ST01_CANONICAL_PROMOTION_ROLLBACK_CANARY_V1";

export function expectedOnePieceSt01StagingBindingsV1(plan) {
  return (plan?.payload?.numbered_cards ?? []).map((row) => ({
    id: row.staging_row_id,
    source_product_id: Number(row.source_product_id),
    source_group_id: 3189,
    record_class: "exact_single_card_candidate",
    single_card_kind: "numbered_card",
    payload_sha256: row.staging_payload_sha256,
  })).sort((left, right) => left.source_product_id - right.source_product_id);
}

export function evaluateOnePieceSt01PromotionPreflightV1({ plan, snapshot }) {
  const findings = [...validateOnePieceSt01PromotionPlanV1(plan).findings]
    .map((value) => `plan:${value}`);
  const add = (condition, code) => {
    if (condition) findings.push(code);
  };
  add(snapshot?.transaction_read_only !== true, "preflight_not_read_only");
  add(Number(snapshot?.foundation?.game_count) !== 1 ||
    snapshot?.foundation?.game_id !== ONE_PIECE_GAME_ID,
  "foundation_game_mismatch");
  add(Number(snapshot?.foundation?.release_count) !== 1 ||
    snapshot?.foundation?.release_status !== "hidden" ||
    snapshot?.foundation?.release_version !==
      "ONE_PIECE_CANONICAL_CATALOG_FOUNDATION_V1",
  "foundation_release_mismatch");
  add(snapshot?.foundation?.anon_visible !== false ||
    snapshot?.foundation?.authenticated_visible !== false ||
    snapshot?.foundation?.service_visible !== false,
  "foundation_visibility_open");
  add(Number(snapshot?.foundation?.migration_count) !== 1,
    "foundation_migration_mismatch");
  add(Number(snapshot?.foundation?.one_piece_set_count) !== 0 ||
    Number(snapshot?.foundation?.one_piece_card_count) !== 0,
  "existing_one_piece_canonical_rows");
  const requiredSchema = [
    "sets", "card_prints", "card_print_identity",
    "card_print_identity_source_evidence", "external_mappings",
  ];
  for (const table of requiredSchema) {
    add(snapshot?.schema?.[table] !== true, `schema_missing:${table}`);
  }
  const expectedStaging = expectedOnePieceSt01StagingBindingsV1(plan);
  add(stableJson(snapshot?.staging_rows ?? []) !== stableJson(expectedStaging),
    "durable_staging_binding_mismatch");
  for (const [key, value] of Object.entries(snapshot?.collisions ?? {})) {
    add(Number(value) !== 0, `collision:${key}`);
  }
  add((snapshot?.blocking_pids ?? []).length !== 0, "database_session_blocked");
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function evaluateOnePieceSt01AttributableWritesV1(rows) {
  const expected = expectedOnePieceSt01AttributableWritesV1();
  const normalized = (rows ?? []).map((row) => ({
    table_name: row.table_name,
    inserted: Number(row.inserted),
    updated: Number(row.updated),
    deleted: Number(row.deleted),
    hot_updated: Number(row.hot_updated),
  }));
  const findings = [];
  for (const [table, inserted] of Object.entries(expected)) {
    const row = normalized.find((item) => item.table_name === table);
    if (!row || row.inserted !== inserted || row.updated !== 0 ||
        row.deleted !== 0 || row.hot_updated !== 0) {
      findings.push(`attributable_write_mismatch:${table}`);
    }
  }
  for (const row of normalized) {
    if (!(row.table_name in expected)) {
      findings.push(`unexpected_attributable_write:${row.table_name}`);
    }
  }
  return [...new Set(findings)];
}

export function evaluateOnePieceSt01CanaryReadbackV1({ plan, readback }) {
  const findings = [];
  const expected = plan?.counts ?? {};
  for (const [key, value] of Object.entries(expected)) {
    if (Number(readback?.[key]) !== Number(value)) {
      findings.push(`transaction_readback_mismatch:${key}`);
    }
  }
  if (readback?.release_status !== "hidden" ||
      readback?.anon_visible !== false ||
      readback?.authenticated_visible !== false ||
      readback?.service_visible !== false) {
    findings.push("transaction_visibility_not_hidden");
  }
  return [...new Set(findings)];
}

export function buildOnePieceSt01PreflightFingerprintV1({
  producerCommitSha,
  planFingerprint,
  snapshot,
}) {
  return sha256(stableJson({
    version: ONE_PIECE_ST01_PREFLIGHT_VERSION,
    producer_commit_sha: producerCommitSha,
    plan_fingerprint_sha256: planFingerprint,
    snapshot,
  }));
}
