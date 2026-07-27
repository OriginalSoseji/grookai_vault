import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import dotenv from 'dotenv';

import {
  readVerifiedArtifact,
  writeShardedRows,
} from './artifact_rows_v1.mjs';
import {
  buildArtifact,
  contentFingerprint,
  stableJson,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';
import {
  assertAuditOnlyArgs,
  withReadOnlyClient,
} from './read_only_guard_v1.mjs';

export const PAYLOAD_PREFLIGHT_VERSION =
  'JPN-MASTER-INDEX-PAYLOAD-PREFLIGHT-V1';

const DEFAULT_PROMOTION_PACKAGE =
  'docs/audits/japanese_master_index_v4/promotion_package/'
  + 'jpn_promotion_package_v1.json';
const DEFAULT_FINAL_MANIFEST =
  'docs/audits/japanese_master_index_v4/final/'
  + 'jpn_master_build_manifest_v1.json';
const DEFAULT_UNION_MANIFEST =
  'docs/audits/japanese_master_index_v4/index/'
  + 'candidate_union_manifest_v1.json';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/payload_preflight';

const IDENTITY_VERSION = 'pokemon_jpn:v1';
const TARGET_TABLES = [
  'sets',
  'card_prints',
  'card_print_identity',
  'card_print_identity_source_evidence',
  'card_print_family_review_queue',
  'card_printings',
];

const DATASET_SPECS = [
  ['set_rows', 'jpn_preflight_set_target_rows_v1'],
  ['card_print_rows', 'jpn_preflight_card_print_target_rows_v1'],
  ['identity_rows', 'jpn_preflight_identity_target_rows_v1'],
  ['evidence_rows', 'jpn_preflight_evidence_target_rows_v1'],
  ['family_review_rows', 'jpn_preflight_family_review_target_rows_v1'],
  ['child_printing_rows', 'jpn_preflight_child_printing_target_rows_v1'],
  ['collision_rows', 'jpn_preflight_collision_rows_v1'],
];

function text(value) {
  return String(value ?? '').normalize('NFKC').trim();
}

function unique(values) {
  return [...new Set(
    (values ?? []).map(text).filter(Boolean),
  )].sort((left, right) => left.localeCompare(right, 'ja'));
}

function sortRows(rows, keys) {
  return [...rows].sort((left, right) => {
    for (const key of keys) {
      const comparison = text(left[key]).localeCompare(
        text(right[key]),
        'en',
        { numeric: true },
      );
      if (comparison !== 0) return comparison;
    }
    return 0;
  });
}

export function deterministicUuid(seed) {
  const bytes = crypto
    .createHash('sha256')
    .update(String(seed))
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-`
    + `${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sha256Value(value) {
  return contentFingerprint(value);
}

export function parseJapaneseReleaseDate(values) {
  for (const raw of values ?? []) {
    const value = text(raw);
    const match = value.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
    if (!match) continue;
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

function consensusInteger(values) {
  const integers = unique(values)
    .map((value) => value.match(/\d+/)?.[0] ?? null)
    .filter(Boolean)
    .map(Number);
  return new Set(integers).size === 1 ? integers[0] : null;
}

export function setRoleForReleaseKind(releaseKind) {
  const roles = {
    constructed_deck: 'product_insert',
    expansion_or_subset: 'expansion',
    magazine_movie_media: 'magazine',
    product_exclusive_distribution: 'product_insert',
    promo_series: 'promotion_umbrella',
    tournament_trophy_event: 'tournament',
    vending: 'product_insert',
  };
  return roles[releaseKind] ?? 'product_insert';
}

function slug(value, fallback = 'UNKNOWN') {
  const normalized = text(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

function setSegment(setCode) {
  return slug(text(setCode).replace(/^jpn-/i, ''), 'SET');
}

function targetSetCode(candidate) {
  return candidate.target_set.live_set_code
    || candidate.target_set.jpn_set_key;
}

function numberSegment(number) {
  return slug(number, 'NUMBER');
}

function normalizedName(value) {
  return text(value).replace(/\s+/g, ' ');
}

function preferredRarity(values) {
  const rejected = new Set(['none', 'promo', '—', '-', 'unknown']);
  const candidates = unique(values).filter(
    (value) => !rejected.has(value.toLowerCase()),
  );
  return candidates.length === 1 ? candidates[0] : null;
}

function preferredRegulationMark(values) {
  const candidates = unique(values).filter(
    (value) => /^[A-Z]$/i.test(value),
  );
  return candidates.length === 1 ? candidates[0].toUpperCase() : null;
}

function printedSetAbbrev(setCode, officialCodes = []) {
  const official = unique(officialCodes)[0];
  return official || text(setCode).replace(/^jpn-/i, '').toUpperCase();
}

function assertionDescriptorByKey(rows) {
  return new Map(rows.map((row) => [row.assertion_key, row]));
}

function speciesDescriptorById(rows) {
  return new Map(rows.map((row) => [row.id, row]));
}

function displayNameForCard(candidate, speciesById) {
  const speciesId = candidate.family_relationship.species_id;
  const species = speciesId ? speciesById.get(speciesId) : null;
  return normalizedName(
    species?.display_name
      ?? candidate.printed_identity.collector_facing_name_en,
  );
}

function sourceImage(candidate) {
  return unique(candidate.image_evidence.urls)[0] ?? null;
}

function setTargetRow(candidate) {
  const setId = deterministicUuid(
    `${PAYLOAD_PREFLIGHT_VERSION}:set:${candidate.candidate_key}`,
  );
  const abbrev = printedSetAbbrev(
    candidate.candidate_key,
    candidate.official_code_evidence,
  );
  return {
    candidate_key: candidate.candidate_key,
    apply_lane: 'insert_pending_explicit_approval',
    db_row: {
      id: setId,
      game: 'pokemon',
      code: candidate.candidate_key,
      name: candidate.collector_facing_name_en
        || candidate.canonical_name_ja,
      release_date: parseJapaneseReleaseDate(
        candidate.release_date_evidence,
      ),
      source: {
        package_id: PAYLOAD_PREFLIGHT_VERSION,
        registry_entry_kind: candidate.registry_entry_kind,
        release_kind: candidate.release_kind,
        canonical_name_ja: candidate.canonical_name_ja,
        source_aliases: unique(candidate.source_aliases),
        source_ids: unique(candidate.source_ids),
        release_date_evidence: unique(candidate.release_date_evidence),
        era_evidence: unique(candidate.era_evidence),
        official_code_evidence: unique(candidate.official_code_evidence),
        dependent_novel_card_count:
          candidate.dependent_novel_card_count,
      },
      printed_total: consensusInteger(
        candidate.expected_card_count_evidence,
      ),
      printed_set_abbrev: abbrev,
      set_role: setRoleForReleaseKind(candidate.release_kind),
      identity_domain_default: 'pokemon_jpn',
      identity_model: 'standard',
    },
  };
}

function acquisitionKey(candidate) {
  return `${PAYLOAD_PREFLIGHT_VERSION}|${candidate.candidate_key}`;
}

function naturalKey(setId, numberPlain) {
  return `${setId}|${numberPlain}`;
}

function modifierFor(candidate, hasLiveNaturalConflict) {
  if (!hasLiveNaturalConflict) return null;
  return `jpn_v4_${slug(
    candidate.printed_identity.collector_facing_name_en,
    'CARD',
  ).toLowerCase()}_${sha256Value(candidate.candidate_key).slice(0, 10)}`;
}

function gvIdFor(candidate, hasLiveNaturalConflict) {
  const base = `GV-PK-JPN-${setSegment(targetSetCode(candidate))}-`
    + numberSegment(candidate.printed_identity.printed_number);
  if (!hasLiveNaturalConflict) return base;
  return `${base}-${sha256Value(candidate.candidate_key)
    .slice(0, 10)
    .toUpperCase()}`;
}

function identityPayload(candidate, modifier) {
  return {
    edition_marking: unique(
      candidate.printed_identity.identity_modifiers,
    ),
    language_code: 'ja',
    rarity_policy: 'source_evidence_preserved',
    release_context: {
      registry_key: candidate.target_set.jpn_set_key,
      set_code_identity: targetSetCode(candidate),
    },
    variant_key_current: 'base',
    card_domain: candidate.printed_identity.card_domain,
    card_type: candidate.printed_identity.card_type,
    collector_facing_name_source:
      candidate.printed_identity.collector_facing_name_source,
    family_key: candidate.family_relationship.family_key,
    printed_identity_modifier: modifier,
  };
}

function evidenceSubject(candidate, displayName, modifier) {
  return {
    identity_domain: 'pokemon_jpn',
    language_scope: 'ja',
    set_code_identity: targetSetCode(candidate),
    source_registry_key: candidate.target_set.jpn_set_key,
    printed_number: candidate.printed_identity.printed_number,
    printed_name_ja: candidate.printed_identity.printed_name_ja,
    collector_facing_name_en: displayName,
    printed_identity_modifier: modifier,
    family_key: candidate.family_relationship.family_key,
    species_id: candidate.family_relationship.species_id,
  };
}

function familyCandidate(candidate) {
  if (candidate.family_relationship.species_id) {
    return candidate.family_relationship.species_id;
  }
  return candidate.family_relationship.family_key;
}

export function buildPayloadContracts({
  setCandidates,
  cardCandidates,
  assertions,
  speciesRows,
  liveNaturalConflicts = new Set(),
}) {
  const setRows = setCandidates.map(setTargetRow);
  const setByKey = new Map(
    setRows.map((row) => [row.candidate_key, row.db_row]),
  );
  const assertionByKey = assertionDescriptorByKey(assertions);
  const speciesById = speciesDescriptorById(speciesRows);
  const cardPrintRows = [];
  const identityRows = [];
  const evidenceRows = [];
  const familyReviewRows = [];
  const childPrintingRows = [];

  for (const candidate of cardCandidates) {
    const setId = candidate.target_set.live_set_id
      ?? setByKey.get(candidate.target_set.jpn_set_key)?.id;
    if (!setId) {
      throw new Error(
        `No target set ID for ${candidate.candidate_key}`,
      );
    }

    const number = candidate.printed_identity.printed_number;
    const setCodeIdentity = targetSetCode(candidate);
    const hasLiveNaturalConflict = liveNaturalConflicts.has(
      naturalKey(setId, number),
    );
    const modifier = modifierFor(candidate, hasLiveNaturalConflict);
    const gvId = gvIdFor(candidate, hasLiveNaturalConflict);
    const displayName = displayNameForCard(candidate, speciesById);
    const cardPrintId = deterministicUuid(
      `${PAYLOAD_PREFLIGHT_VERSION}:card_print:${candidate.candidate_key}`,
    );
    const identityId = deterministicUuid(
      `${PAYLOAD_PREFLIGHT_VERSION}:identity:${candidate.candidate_key}`,
    );
    const childId = deterministicUuid(
      `${PAYLOAD_PREFLIGHT_VERSION}:child:normal:${candidate.candidate_key}`,
    );
    const acquisition = acquisitionKey(candidate);
    const subject = evidenceSubject(candidate, displayName, modifier);
    const imageUrl = sourceImage(candidate);
    const assertionKeys = unique(
      candidate.source_evidence.source_assertion_keys,
    );
    const sourceRows = assertionKeys.map((key) => {
      const assertion = assertionByKey.get(key);
      if (!assertion) {
        throw new Error(`Source assertion not found: ${key}`);
      }
      return assertion;
    });

    cardPrintRows.push({
      candidate_key: candidate.candidate_key,
      apply_lane: 'insert_pending_explicit_approval',
      source_promotion_lane: candidate.promotion_lane,
      db_row: {
        id: cardPrintId,
        set_id: setId,
        name: displayName,
        number,
        number_plain: number,
        variant_key: '',
        rarity: preferredRarity(
          sourceRows.flatMap((row) => row.rarity_evidence ?? []),
        ),
        image_url: imageUrl,
        image_alt_url: unique(candidate.image_evidence.urls)[1] ?? null,
        image_source: imageUrl ? 'identity' : null,
        image_status: imageUrl ? 'ok' : 'missing',
        image_note: imageUrl
          ? 'External identity evidence pointer; self-hosting remains a '
            + 'separate storage gate.'
          : 'No image pointer admitted.',
        external_ids: {
          japanese_master_index_v4: {
            candidate_key: candidate.candidate_key,
            acquisition_key: acquisition,
            source_assertion_keys: assertionKeys,
            source_ids: unique(candidate.source_evidence.source_ids),
            image_evidence_urls: unique(candidate.image_evidence.urls),
          },
        },
        variants: {},
        print_identity_key: null,
        ai_metadata: null,
        data_quality_flags: {
          japanese_master_index_v4: {
            package_id: PAYLOAD_PREFLIGHT_VERSION,
            public_child_status:
              'deferred_visibility_and_storage_gate',
            family_status: candidate.family_relationship.family_status,
          },
        },
        image_res: null,
        gv_id: gvId,
        set_code: setCodeIdentity,
        printed_set_abbrev: printedSetAbbrev(
          setCodeIdentity,
        ),
        printed_total: null,
        regulation_mark: preferredRegulationMark(
          sourceRows.flatMap(
            (row) => row.regulation_mark_evidence ?? [],
          ),
        ),
        identity_domain: 'pokemon_jpn',
        printed_identity_modifier: modifier,
        set_identity_model: 'standard',
        representative_image_url: null,
      },
    });

    identityRows.push({
      candidate_key: candidate.candidate_key,
      apply_lane: 'insert_pending_explicit_approval',
      hash_input: {
        identity_domain: 'pokemon_jpn',
        identity_key_version: IDENTITY_VERSION,
        set_code_identity: setCodeIdentity,
        printed_number: number,
        normalized_printed_name: displayName,
        source_name_raw: candidate.printed_identity.printed_name_ja,
        identity_payload: identityPayload(candidate, modifier),
      },
      db_row: {
        id: identityId,
        card_print_id: cardPrintId,
        identity_domain: 'pokemon_jpn',
        set_code_identity: setCodeIdentity,
        printed_number: number,
        normalized_printed_name: displayName,
        source_name_raw: candidate.printed_identity.printed_name_ja,
        identity_payload: identityPayload(candidate, modifier),
        identity_key_version: IDENTITY_VERSION,
        identity_key_hash: null,
        is_active: true,
      },
    });

    for (const assertion of sourceRows) {
      const evidencePayload = {
        package_id: PAYLOAD_PREFLIGHT_VERSION,
        assertion_key: assertion.assertion_key,
        assertion_lane: assertion.assertion_lane,
        registry_key: assertion.registry_key,
        resolution_status: assertion.resolution_status,
        source_external_id: assertion.source_external_id,
        raw_snapshot_ref: assertion.raw_snapshot_ref,
        raw_snapshot_sha256: assertion.raw_snapshot_sha256,
        image_urls: unique(assertion.image_urls),
      };
      evidenceRows.push({
        candidate_key: candidate.candidate_key,
        assertion_key: assertion.assertion_key,
        apply_lane: 'insert_pending_explicit_approval',
        db_row: {
          id: deterministicUuid(
            `${PAYLOAD_PREFLIGHT_VERSION}:evidence:`
            + `${candidate.candidate_key}:${assertion.assertion_key}`,
          ),
          card_print_identity_id: identityId,
          card_print_id: cardPrintId,
          acquisition_key: acquisition,
          source_key: assertion.source_key,
          evidence_key_hash: sha256Value({
            acquisition_key: acquisition,
            source_key: assertion.source_key,
            evidence_subject: subject,
            evidence_payload: evidencePayload,
          }),
          evidence_subject: subject,
          evidence_payload: evidencePayload,
          active: true,
        },
      });
    }

    const normalizedFamilyCandidate = familyCandidate(candidate);
    familyReviewRows.push({
      candidate_key: candidate.candidate_key,
      apply_lane: 'insert_pending_explicit_approval',
      db_row: {
        id: deterministicUuid(
          `${PAYLOAD_PREFLIGHT_VERSION}:family_review:`
          + candidate.candidate_key,
        ),
        card_print_identity_id: identityId,
        card_print_id: cardPrintId,
        acquisition_key: acquisition,
        family_status: candidate.family_relationship.family_status,
        family_candidate_source: 'jpn_master_index_v4',
        normalized_family_candidate: normalizedFamilyCandidate,
        review_status: 'pending',
        family_link_promotion_allowed: false,
        review_key_hash: sha256Value({
          acquisition_key: acquisition,
          card_print_id: cardPrintId,
          identity_id: identityId,
          normalized_family_candidate: normalizedFamilyCandidate,
        }),
        evidence_subject: {
          ...subject,
          relationship_type:
            candidate.family_relationship.relationship_type,
          confidence: candidate.family_relationship.confidence,
          source_assertion_keys: assertionKeys,
        },
        active: true,
      },
    });

    childPrintingRows.push({
      candidate_key: candidate.candidate_key,
      apply_lane: 'deferred_visibility_and_storage_gate',
      gate_blockers: [
        'separate_public_visibility_approval_required',
        'self_hosted_image_pointer_not_proven',
      ],
      db_row: {
        id: childId,
        card_print_id: cardPrintId,
        finish_key: 'normal',
        is_provisional: false,
        provenance_source: 'jpn_master_index_v4',
        provenance_ref: candidate.candidate_key,
        created_by: PAYLOAD_PREFLIGHT_VERSION,
        printing_gv_id: `${gvId}-STD`,
        image_source: imageUrl ? 'identity' : null,
        image_path: null,
        image_url: imageUrl,
        image_alt_url: unique(candidate.image_evidence.urls)[1] ?? null,
        image_status: imageUrl ? 'ok' : 'missing',
        image_note: imageUrl
          ? 'Deferred public child using external evidence pointer; '
            + 'self-hosting not yet proven.'
          : 'Deferred public child without image pointer.',
      },
    });
  }

  return {
    set_rows: sortRows(setRows, ['candidate_key']),
    card_print_rows: sortRows(cardPrintRows, ['candidate_key']),
    identity_rows: sortRows(identityRows, ['candidate_key']),
    evidence_rows: sortRows(
      evidenceRows,
      ['candidate_key', 'assertion_key'],
    ),
    family_review_rows: sortRows(
      familyReviewRows,
      ['candidate_key'],
    ),
    child_printing_rows: sortRows(
      childPrintingRows,
      ['candidate_key'],
    ),
  };
}

function parseArgs(argv) {
  const options = {
    promotionPackage: DEFAULT_PROMOTION_PACKAGE,
    finalManifest: DEFAULT_FINAL_MANIFEST,
    unionManifest: DEFAULT_UNION_MANIFEST,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    envFile: null,
    environmentLabel: 'production-read-only',
  };
  for (const arg of argv) {
    if (arg.startsWith('--promotion-package=')) {
      options.promotionPackage = arg.slice(
        '--promotion-package='.length,
      );
    } else if (arg.startsWith('--final-manifest=')) {
      options.finalManifest = arg.slice('--final-manifest='.length);
    } else if (arg.startsWith('--union-manifest=')) {
      options.unionManifest = arg.slice('--union-manifest='.length);
    } else if (arg.startsWith('--output-root=')) {
      options.outputRoot = arg.slice('--output-root='.length);
    } else if (arg.startsWith('--env-file=')) {
      options.envFile = arg.slice('--env-file='.length);
    } else if (arg.startsWith('--environment=')) {
      options.environmentLabel = arg.slice('--environment='.length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function loadDescriptor(descriptor) {
  const rows = [];
  for (const shardPath of descriptor.shard_paths) {
    const { artifact } = await readVerifiedArtifact(shardPath);
    rows.push(...artifact.content.rows);
  }
  if (
    rows.length !== descriptor.row_count
    || contentFingerprint(rows) !== descriptor.content_fingerprint_sha256
  ) {
    throw new Error(`Dataset verification failed: ${descriptor.dataset_key}`);
  }
  return rows;
}

async function loadManifestDataset(manifestPath, datasetKey) {
  const { artifact } = await readVerifiedArtifact(manifestPath);
  const descriptor = artifact.content.datasets.find(
    (row) => row.dataset_key === datasetKey,
  );
  if (!descriptor) throw new Error(`Dataset not found: ${datasetKey}`);
  return {
    descriptor,
    rows: await loadDescriptor(descriptor),
  };
}

async function migrationCoverage() {
  const migrationRoot = 'supabase/migrations';
  const files = (await fs.readdir(migrationRoot))
    .filter((filename) => filename.endsWith('.sql'));
  const contents = await Promise.all(files.map(async (filename) => ({
    filename,
    body: (await fs.readFile(
      path.join(migrationRoot, filename),
      'utf8',
    )).toLowerCase(),
  })));
  const required = [
    'card_print_identity_source_evidence',
    'card_print_family_review_queue',
  ];
  return required.map((table) => ({
    table,
    creating_migration_paths: contents
      .filter(({ body }) => (
        body.includes(`create table public.${table}`)
        || body.includes(`create table if not exists public.${table}`)
      ))
      .map(({ filename }) => `${migrationRoot}/${filename}`),
  }));
}

async function schemaContract(db) {
  const columns = await db.query(
    `select table_name, column_name, data_type, is_nullable,
            column_default
     from information_schema.columns
     where table_schema = 'public'
       and table_name = any($1::text[])
     order by table_name, ordinal_position`,
    [TARGET_TABLES],
  );
  const constraints = await db.query(
    `select c.relname as table_name,
            con.conname as constraint_name,
            con.contype as constraint_type,
            pg_get_constraintdef(con.oid) as definition
     from pg_constraint con
     join pg_class c on c.oid = con.conrelid
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = any($1::text[])
     order by c.relname, con.conname`,
    [TARGET_TABLES],
  );
  const indexes = await db.query(
    `select tablename as table_name, indexname, indexdef
     from pg_indexes
     where schemaname = 'public'
       and tablename = any($1::text[])
     order by tablename, indexname`,
    [TARGET_TABLES],
  );
  return {
    columns: columns.rows,
    constraints: constraints.rows,
    indexes: indexes.rows,
  };
}

async function selectIds(db, table, ids) {
  const rows = [];
  for (let index = 0; index < ids.length; index += 500) {
    const result = await db.query(
      `select id::text from public.${table}
       where id = any($1::uuid[])
       order by id`,
      [ids.slice(index, index + 500)],
    );
    rows.push(...result.rows);
  }
  return rows;
}

async function queryNaturalConflicts(db, targets) {
  const rows = [];
  for (let index = 0; index < targets.length; index += 500) {
    const chunk = targets.slice(index, index + 500);
    const result = await db.query(
      `with proposed as (
         select *
         from jsonb_to_recordset($1::jsonb) as p(
           candidate_key text,
           set_id uuid,
           number_plain text
         )
       )
       select p.candidate_key,
              p.set_id::text,
              p.number_plain,
              cp.id::text as existing_card_print_id,
              cp.gv_id as existing_gv_id,
              cp.name as existing_name,
              cp.printed_identity_modifier
       from proposed p
       join public.card_prints cp
         on cp.set_id = p.set_id
        and cp.number_plain = p.number_plain
        and coalesce(cp.printed_identity_modifier, '') = ''
        and coalesce(cp.variant_key, '') = ''
        and cp.set_identity_model = 'standard'
       order by p.candidate_key, cp.id`,
      [JSON.stringify(chunk)],
    );
    rows.push(...result.rows);
  }
  return rows;
}

async function computeIdentityHashes(db, identityRows) {
  const hashes = new Map();
  for (let index = 0; index < identityRows.length; index += 500) {
    const chunk = identityRows.slice(index, index + 500).map((row) => ({
      candidate_key: row.candidate_key,
      ...row.hash_input,
    }));
    const result = await db.query(
      `select p.candidate_key,
              public.card_print_identity_hash_v1(
                p.identity_domain,
                p.identity_key_version,
                p.set_code_identity,
                p.printed_number,
                p.normalized_printed_name,
                p.source_name_raw,
                p.identity_payload
              ) as identity_key_hash
       from jsonb_to_recordset($1::jsonb) as p(
         candidate_key text,
         identity_domain text,
         identity_key_version text,
         set_code_identity text,
         printed_number text,
         normalized_printed_name text,
         source_name_raw text,
         identity_payload jsonb
       )
       order by p.candidate_key`,
      [JSON.stringify(chunk)],
    );
    for (const row of result.rows) {
      hashes.set(row.candidate_key, row.identity_key_hash);
    }
  }
  return hashes;
}

async function queryTextCollisions(db, table, column, values) {
  const rows = [];
  for (let index = 0; index < values.length; index += 500) {
    const chunk = values.slice(index, index + 500);
    const result = await db.query(
      `select ${column} as value
       from public.${table}
       where ${column} = any($1::text[])
       order by ${column}`,
      [chunk],
    );
    rows.push(...result.rows);
  }
  return rows;
}

function collisionRow(type, targetTable, details, blocking = true) {
  return {
    collision_type: type,
    target_table: targetTable,
    blocking,
    details,
  };
}

function duplicateGroups(rows, keyBuilder) {
  const grouped = new Map();
  for (const row of rows) {
    const key = keyBuilder(row.db_row);
    const values = grouped.get(key) ?? [];
    values.push(row.candidate_key ?? row.assertion_key ?? row.db_row.id);
    grouped.set(key, values);
  }
  return [...grouped.entries()]
    .filter(([, values]) => values.length > 1)
    .map(([key, values]) => ({ key, values: unique(values) }));
}

function validateContractsAgainstSchema(contracts, schema) {
  const collisions = [];
  const rowsByTable = {
    sets: contracts.set_rows,
    card_prints: contracts.card_print_rows,
    card_print_identity: contracts.identity_rows,
    card_print_identity_source_evidence: contracts.evidence_rows,
    card_print_family_review_queue: contracts.family_review_rows,
    card_printings: contracts.child_printing_rows,
  };
  const columnsByTable = new Map();
  for (const column of schema.columns) {
    const columns = columnsByTable.get(column.table_name) ?? [];
    columns.push(column);
    columnsByTable.set(column.table_name, columns);
  }

  for (const [table, rows] of Object.entries(rowsByTable)) {
    const columns = columnsByTable.get(table) ?? [];
    const allowed = new Set(columns.map((column) => column.column_name));
    const required = columns.filter(
      (column) => (
        column.is_nullable === 'NO'
        && column.column_default === null
      ),
    );
    for (const row of rows) {
      const unknownColumns = Object.keys(row.db_row).filter(
        (column) => !allowed.has(column),
      );
      if (unknownColumns.length > 0) {
        collisions.push(collisionRow(
          'target_row_unknown_columns',
          table,
          {
            candidate_key: row.candidate_key,
            columns: unknownColumns,
          },
        ));
      }
      const missingRequired = required
        .map((column) => column.column_name)
        .filter((column) => (
          row.db_row[column] === null
          || row.db_row[column] === undefined
        ));
      if (missingRequired.length > 0) {
        collisions.push(collisionRow(
          'target_row_missing_required_columns',
          table,
          {
            candidate_key: row.candidate_key,
            columns: missingRequired,
          },
        ));
      }
    }
  }

  const uniqueContracts = [
    ['sets', contracts.set_rows, (row) => row.id, 'internal_id'],
    ['sets', contracts.set_rows, (row) => row.code, 'internal_code'],
    [
      'card_prints',
      contracts.card_print_rows,
      (row) => row.id,
      'internal_id',
    ],
    [
      'card_prints',
      contracts.card_print_rows,
      (row) => row.gv_id,
      'internal_gv_id',
    ],
    [
      'card_prints',
      contracts.card_print_rows,
      (row) => [
        row.set_id,
        row.number_plain,
        row.printed_identity_modifier ?? '',
        row.variant_key ?? '',
      ].join('|'),
      'internal_standard_natural_key',
    ],
    [
      'card_print_identity',
      contracts.identity_rows,
      (row) => row.id,
      'internal_id',
    ],
    [
      'card_print_identity',
      contracts.identity_rows,
      (row) => row.identity_key_hash,
      'internal_active_identity_hash',
    ],
    [
      'card_print_identity_source_evidence',
      contracts.evidence_rows,
      (row) => row.id,
      'internal_id',
    ],
    [
      'card_print_identity_source_evidence',
      contracts.evidence_rows,
      (row) => [
        row.card_print_identity_id,
        row.source_key,
        row.acquisition_key,
      ].join('|'),
      'internal_active_evidence_lane',
    ],
    [
      'card_print_family_review_queue',
      contracts.family_review_rows,
      (row) => row.id,
      'internal_id',
    ],
    [
      'card_print_family_review_queue',
      contracts.family_review_rows,
      (row) => [
        row.card_print_identity_id,
        row.family_candidate_source,
        row.normalized_family_candidate,
      ].join('|'),
      'internal_active_family_review_key',
    ],
    [
      'card_printings',
      contracts.child_printing_rows,
      (row) => row.id,
      'internal_id',
    ],
    [
      'card_printings',
      contracts.child_printing_rows,
      (row) => `${row.card_print_id}|${row.finish_key}`,
      'internal_parent_finish_key',
    ],
    [
      'card_printings',
      contracts.child_printing_rows,
      (row) => row.printing_gv_id,
      'internal_printing_gv_id',
    ],
  ];
  for (const [table, rows, keyBuilder, type] of uniqueContracts) {
    for (const group of duplicateGroups(rows, keyBuilder)) {
      collisions.push(collisionRow(type, table, group));
    }
  }
  return collisions;
}

async function capturePreflight({
  db,
  setCandidates,
  cardCandidates,
  assertions,
  schema,
}) {
  const seedSetRows = setCandidates.map(setTargetRow);
  const targetSetByKey = new Map(
    seedSetRows.map((row) => [row.candidate_key, row.db_row]),
  );
  const directSetIds = unique(
    cardCandidates.map((row) => row.target_set.live_set_id),
  );
  const directSets = directSetIds.length === 0
    ? []
    : (await db.query(
      `select id::text, code, name
       from public.sets
       where id = any($1::uuid[])
       order by id`,
      [directSetIds],
    )).rows;
  const directSetById = new Map(
    directSets.map((row) => [row.id, row]),
  );
  const expectedDirectSets = cardCandidates
    .filter((row) => row.target_set.live_set_id)
    .map((row) => ({
      candidate_key: row.candidate_key,
      set_id: row.target_set.live_set_id,
      expected_code: row.target_set.live_set_code,
    }));

  const naturalTargets = cardCandidates.map((row) => ({
    candidate_key: row.candidate_key,
    set_id: row.target_set.live_set_id
      ?? targetSetByKey.get(row.target_set.jpn_set_key)?.id,
    number_plain: row.printed_identity.printed_number,
  }));
  const naturalCollisionRows = await queryNaturalConflicts(
    db,
    naturalTargets,
  );
  const liveNaturalConflicts = new Set(
    naturalCollisionRows.map(
      (row) => naturalKey(row.set_id, row.number_plain),
    ),
  );

  const speciesIds = unique(
    cardCandidates.map((row) => row.family_relationship.species_id),
  );
  const speciesRows = speciesIds.length === 0
    ? []
    : (await db.query(
      `select id::text, canonical_name, display_name, active
       from public.pokemon_species
       where id = any($1::uuid[])
       order by id`,
      [speciesIds],
    )).rows;

  const contracts = buildPayloadContracts({
    setCandidates,
    cardCandidates,
    assertions,
    speciesRows,
    liveNaturalConflicts,
  });
  const identityHashes = await computeIdentityHashes(
    db,
    contracts.identity_rows,
  );
  for (const row of contracts.identity_rows) {
    row.db_row.identity_key_hash = identityHashes.get(row.candidate_key);
  }

  const collisions = [];
  const missingDirectSets = expectedDirectSets.filter(
    (row) => !directSetById.has(row.set_id),
  );
  const changedDirectSets = expectedDirectSets.filter((row) => {
    const live = directSetById.get(row.set_id);
    return live && live.code !== row.expected_code;
  });
  for (const row of missingDirectSets) {
    collisions.push(collisionRow(
      'direct_target_set_missing',
      'sets',
      row,
    ));
  }
  for (const row of changedDirectSets) {
    collisions.push(collisionRow(
      'direct_target_set_code_changed',
      'sets',
      {
        ...row,
        live_code: directSetById.get(row.set_id)?.code,
      },
    ));
  }

  const setCodeCollisions = await queryTextCollisions(
    db,
    'sets',
    'code',
    contracts.set_rows.map((row) => row.db_row.code),
  );
  for (const row of setCodeCollisions) {
    collisions.push(collisionRow(
      'set_code_exists',
      'sets',
      row,
    ));
  }

  const idCollisionSpecs = [
    ['sets', contracts.set_rows],
    ['card_prints', contracts.card_print_rows],
    ['card_print_identity', contracts.identity_rows],
    [
      'card_print_identity_source_evidence',
      contracts.evidence_rows,
    ],
    [
      'card_print_family_review_queue',
      contracts.family_review_rows,
    ],
    ['card_printings', contracts.child_printing_rows],
  ];
  for (const [table, rows] of idCollisionSpecs) {
    const found = await selectIds(
      db,
      table,
      rows.map((row) => row.db_row.id),
    );
    for (const row of found) {
      collisions.push(collisionRow(
        'deterministic_id_exists',
        table,
        row,
      ));
    }
  }

  const gvCollisions = await queryTextCollisions(
    db,
    'card_prints',
    'gv_id',
    contracts.card_print_rows.map((row) => row.db_row.gv_id),
  );
  for (const row of gvCollisions) {
    collisions.push(collisionRow(
      'public_gv_id_exists',
      'card_prints',
      row,
    ));
  }

  const printingGvCollisions = await queryTextCollisions(
    db,
    'card_printings',
    'printing_gv_id',
    contracts.child_printing_rows.map(
      (row) => row.db_row.printing_gv_id,
    ),
  );
  for (const row of printingGvCollisions) {
    collisions.push(collisionRow(
      'printing_gv_id_exists',
      'card_printings',
      row,
    ));
  }

  const identityHashCollisions = [];
  const hashRows = contracts.identity_rows;
  for (let index = 0; index < hashRows.length; index += 500) {
    const result = await db.query(
      `select identity_key_hash, card_print_id::text
       from public.card_print_identity
       where identity_domain = 'pokemon_jpn'
         and identity_key_version = $1
         and identity_key_hash = any($2::text[])
         and is_active
       order by identity_key_hash`,
      [
        IDENTITY_VERSION,
        hashRows.slice(index, index + 500).map(
          (row) => row.db_row.identity_key_hash,
        ),
      ],
    );
    identityHashCollisions.push(...result.rows);
  }
  for (const row of identityHashCollisions) {
    collisions.push(collisionRow(
      'active_identity_hash_exists',
      'card_print_identity',
      row,
    ));
  }

  const knownSpecies = new Set(speciesRows.map((row) => row.id));
  for (const speciesId of speciesIds.filter(
    (id) => !knownSpecies.has(id),
  )) {
    collisions.push(collisionRow(
      'species_target_missing',
      'pokemon_species',
      { species_id: speciesId },
    ));
  }

  const finish = await db.query(
    `select key, is_active
     from public.finish_keys
     where key = 'normal'`,
  );
  if (finish.rows.length !== 1 || finish.rows[0].is_active !== true) {
    collisions.push(collisionRow(
      'normal_finish_key_unavailable',
      'finish_keys',
      { rows: finish.rows },
    ));
  }

  for (const row of naturalCollisionRows) {
    collisions.push(collisionRow(
      'base_natural_key_occupied_modifier_assigned',
      'card_prints',
      row,
      false,
    ));
  }

  collisions.push(...validateContractsAgainstSchema(contracts, schema));

  const missingSchemaTables = TARGET_TABLES.filter(
    (table) => !schema.columns.some((row) => row.table_name === table),
  );
  for (const table of missingSchemaTables) {
    collisions.push(collisionRow(
      'target_table_missing',
      table,
      { table },
    ));
  }

  return {
    contracts,
    collisions: sortRows(
      collisions,
      ['blocking', 'target_table', 'collision_type'],
    ),
    live_snapshot: {
      direct_target_set_count: directSets.length,
      natural_base_occupancy_count: naturalCollisionRows.length,
      species_target_count: speciesIds.length,
      species_target_resolved_count: speciesRows.length,
      schema_fingerprint_sha256: contentFingerprint(schema),
    },
  };
}

function markdown(report) {
  const lines = [
    '# Japanese Master Index V4 Payload Preflight',
    '',
    `Generated: ${report.generated_at}`,
    '',
    '## Status',
    '',
    `- Status: \`${report.status}\``,
    `- Payload fingerprint: \`${report.payload_fingerprint_sha256}\``,
    `- Blocking collisions: ${report.summary.blocking_collisions}`,
    `- Non-blocking natural-key accommodations: `
      + report.summary.nonblocking_collisions,
    '',
    '## Proposed Rows',
    '',
    `- Sets: ${report.summary.set_rows}`,
    `- Parent card_prints: ${report.summary.card_print_rows}`,
    `- card_print_identity: ${report.summary.identity_rows}`,
    `- Source evidence: ${report.summary.evidence_rows}`,
    `- Family review: ${report.summary.family_review_rows}`,
    `- Deferred public child printings: `
      + report.summary.child_printing_rows,
    '',
    '## Boundaries',
    '',
    '- The database was opened in a proven read-only transaction.',
    '- No database writes, Storage writes, SQL payload, or apply command '
      + 'were generated.',
    '- Public child rows are identifiers/contracts only and remain blocked '
      + 'behind separate visibility and self-hosted-image approval.',
    '- No English card, pricing, family-link, or identity rows were mutated.',
    '',
    '## Repository Schema Coverage',
    '',
  ];
  for (const row of report.repository_schema_coverage) {
    lines.push(
      `- \`${row.table}\`: ${row.creating_migration_paths.length > 0
        ? row.creating_migration_paths.join(', ')
        : '**no creating migration found in the repository**'}`,
    );
  }
  lines.push('');
  if (report.summary.repository_schema_drift_tables > 0) {
    lines.push('This drift must be repaired before a fresh-chain apply package '
      + 'can be considered production-ready.');
  } else {
    lines.push('All required payload target tables now have creating '
      + 'migrations in the repository.');
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  assertAuditOnlyArgs();
  const options = parseArgs(process.argv.slice(2));
  if (options.envFile) {
    dotenv.config({ path: options.envFile, quiet: true });
  }
  dotenv.config({ quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL;

  const { artifact: promotionPackage } = await readVerifiedArtifact(
    options.promotionPackage,
  );
  const { artifact: finalManifest } = await readVerifiedArtifact(
    options.finalManifest,
  );
  const directCards = await loadDescriptor(
    promotionPackage.content.datasets.direct_card_candidates,
  );
  const dependentCards = await loadDescriptor(
    promotionPackage.content.datasets.set_dependent_card_candidates,
  );
  const setCandidates = await loadDescriptor(
    promotionPackage.content.datasets.set_insert_candidates,
  );
  const cardCandidates = sortRows(
    [...directCards, ...dependentCards],
    ['candidate_key'],
  );
  const assertionKeys = new Set(
    cardCandidates.flatMap(
      (row) => row.source_evidence.source_assertion_keys,
    ),
  );
  const union = await loadManifestDataset(
    options.unionManifest,
    'source_assertion_union_rows_v1',
  );
  const assertions = union.rows.filter(
    (row) => assertionKeys.has(row.assertion_key),
  );
  if (assertions.length !== assertionKeys.size) {
    throw new Error(
      `Assertion coverage mismatch: ${assertions.length} != `
      + assertionKeys.size,
    );
  }

  const repositorySchemaCoverage = await migrationCoverage();
  const generatedAt = new Date().toISOString();
  const result = await withReadOnlyClient({
    connectionString,
    environmentLabel: options.environmentLabel,
  }, async (db, guard) => {
    const schema = await schemaContract(db);
    const preflight = await capturePreflight({
      db,
      setCandidates,
      cardCandidates,
      assertions,
      schema,
    });
    return { guard, schema, preflight };
  });

  const retrieval = {
    access_mode: 'live_database_proven_read_only_plus_local_artifacts',
    database_reads: true,
    database_writes: false,
    source_fetches: false,
    storage_access: false,
    guard: result.guard,
  };
  const descriptors = {};
  const rowsByKey = {
    ...result.preflight.contracts,
    collision_rows: result.preflight.collisions,
  };
  for (const [key, datasetKey] of DATASET_SPECS) {
    descriptors[key] = await writeShardedRows({
      outputRoot: options.outputRoot,
      datasetKey,
      packageId: `${PAYLOAD_PREFLIGHT_VERSION}:${datasetKey}`,
      rows: rowsByKey[key],
      generatedAt,
      retrieval,
    });
  }
  const schemaArtifactPath = path.join(
    options.outputRoot,
    'jpn_payload_target_schema_contract_v1.json',
  );
  const schemaArtifact = buildArtifact({
    packageId: 'JPN-PAYLOAD-TARGET-SCHEMA-CONTRACT-V1',
    generatedAt,
    retrieval,
    content: result.schema,
  });
  const schemaArtifactRecord = await writeJsonArtifact(
    schemaArtifactPath,
    schemaArtifact,
  );

  const blockingCollisions = result.preflight.collisions.filter(
    (row) => row.blocking,
  );
  const missingMigrationCoverage = repositorySchemaCoverage.filter(
    (row) => row.creating_migration_paths.length === 0,
  );
  const payloadFingerprint = contentFingerprint({
    source_promotion_package_fingerprint:
      promotionPackage.content_fingerprint_sha256,
    source_final_manifest_fingerprint:
      finalManifest.content_fingerprint_sha256,
    datasets: Object.fromEntries(
      Object.entries(descriptors).map(([key, value]) => [
        key,
        value.content_fingerprint_sha256,
      ]),
    ),
    live_snapshot: result.preflight.live_snapshot,
    schema_fingerprint_sha256:
      result.preflight.live_snapshot.schema_fingerprint_sha256,
  });
  const status = blockingCollisions.length > 0
    ? 'blocked_by_live_collision'
    : missingMigrationCoverage.length > 0
      ? 'preflight_complete_repository_schema_drift'
      : 'preflight_complete_no_write';
  const report = {
    generated_at: generatedAt,
    generator_version: PAYLOAD_PREFLIGHT_VERSION,
    status,
    payload_fingerprint_sha256: payloadFingerprint,
    source_promotion_package_fingerprint:
      promotionPackage.content_fingerprint_sha256,
    source_final_manifest: options.finalManifest,
    source_final_manifest_fingerprint:
      finalManifest.content_fingerprint_sha256,
    source_union_manifest_fingerprint:
      union.descriptor.content_fingerprint_sha256,
    summary: {
      set_rows: rowsByKey.set_rows.length,
      card_print_rows: rowsByKey.card_print_rows.length,
      identity_rows: rowsByKey.identity_rows.length,
      evidence_rows: rowsByKey.evidence_rows.length,
      family_review_rows: rowsByKey.family_review_rows.length,
      child_printing_rows: rowsByKey.child_printing_rows.length,
      blocking_collisions: blockingCollisions.length,
      nonblocking_collisions:
        result.preflight.collisions.length - blockingCollisions.length,
      repository_schema_drift_tables: missingMigrationCoverage.length,
    },
    datasets: descriptors,
    live_snapshot: result.preflight.live_snapshot,
    schema_contract: {
      fingerprint_sha256: contentFingerprint(result.schema),
      artifact_path: schemaArtifactRecord.path,
      artifact_sha256: schemaArtifactRecord.sha256,
      target_tables: TARGET_TABLES,
      column_count: result.schema.columns.length,
      constraint_count: result.schema.constraints.length,
      index_count: result.schema.indexes.length,
    },
    repository_schema_coverage: repositorySchemaCoverage,
    execution_boundary: {
      database_reads: true,
      database_transaction_read_only: true,
      database_writes: false,
      storage_writes: false,
      source_fetches: false,
      sql_generated: false,
      apply_payload_generated: false,
      deterministic_database_ids_generated: true,
      deterministic_public_gv_ids_generated: true,
      public_child_rows_apply_eligible: false,
      english_mutation: false,
      pricing_mutation: false,
      family_promotion: false,
      promotion_approval_implied: false,
    },
    guard: result.guard,
  };
  const artifact = buildArtifact({
    packageId: PAYLOAD_PREFLIGHT_VERSION,
    generatedAt,
    retrieval,
    content: report,
  });
  await writeJsonArtifact(
    path.join(
      options.outputRoot,
      'jpn_payload_preflight_v1.json',
    ),
    artifact,
  );
  await fs.writeFile(
    path.join(options.outputRoot, 'jpn_payload_preflight_v1.md'),
    markdown(report),
  );
  process.stdout.write(stableJson({
    status,
    payload_fingerprint_sha256: payloadFingerprint,
    summary: report.summary,
    output_root: options.outputRoot,
  }));
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
