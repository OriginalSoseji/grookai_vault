import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config();

const { Client } = pg;

const PACKAGE_ID = 'jpn_pikachu_promo_first_batch_v1';
const DRY_RUN_DIR = path.join(
  'docs',
  'audits',
  'master_identity_graph_v1',
  'jpn_pikachu_promo_first_batch_dry_run_v1',
);
const DRY_RUN_JSON = path.join(DRY_RUN_DIR, 'jpn_pikachu_promo_first_batch_dry_run_v1.json');
const OUT_DIR = path.join(
  'docs',
  'audits',
  'master_identity_graph_v1',
  'jpn_pikachu_promo_first_batch_real_apply_v1',
);
const OUTPUT_JSON = path.join(OUT_DIR, 'jpn_pikachu_promo_first_batch_real_apply_v1.json');
const OUTPUT_MD = path.join(OUT_DIR, 'jpn_pikachu_promo_first_batch_real_apply_v1.md');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stable(value));
}

function sha256(value) {
  const text = typeof value === 'string' ? value : stableJson(value);
  return crypto.createHash('sha256').update(text).digest('hex');
}

function deterministicUuid(seed) {
  const bytes = crypto.createHash('sha256').update(seed).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function sourceSetKey(setCode) {
  return setCode.replace(/^jpn-/, '').toUpperCase();
}

function printedSetAbbrev(setCode) {
  const raw = sourceSetKey(setCode);
  if (raw === 'DPTP') return 'DPtP';
  return raw;
}

function buildAcquisitionKey(target) {
  return `jpn_pikachu_promo_first_batch_v1|set:${printedSetAbbrev(target.set_code)}|num:${target.number_plain}|modifier:${target.printed_identity_modifier}`;
}

function buildSubject(target) {
  return {
    identity_domain: 'pokemon_jpn',
    language_scope: 'ja',
    card_name_en_candidates: [target.name],
    card_name_ja_candidates: [],
    normalized_family_name_candidates: ['pikachu'],
    printed_number: target.number_plain,
    source_number: target.source_number_key,
    set_code_identity: target.set_code,
    source_canonical_set_key: printedSetAbbrev(target.set_code),
    printed_identity_modifier: target.printed_identity_modifier,
  };
}

function buildPayload(dryRun, setRows) {
  const setByCode = new Map(setRows.map((row) => [row.code, row]));
  const targets = dryRun.targets;

  const rows = {
    card_prints: [],
    card_print_identity: [],
    source_evidence: [],
    family_review: [],
  };

  for (const target of targets) {
    const set = setByCode.get(target.set_code);
    if (!set) throw new Error(`Missing set row for ${target.set_code}`);

    const cardPrintId = deterministicUuid(`${PACKAGE_ID}:card_print:${target.gv_id}`);
    const identityId = deterministicUuid(`${PACKAGE_ID}:identity:${target.gv_id}`);
    const acquisitionKey = buildAcquisitionKey(target);
    const evidenceSubject = buildSubject(target);
    const sourceKeys = target.source_evidence.map((row) => row.source_key);

    rows.card_prints.push({
      id: cardPrintId,
      set_id: set.id,
      set_code: target.set_code,
      name: target.name,
      number: target.number_plain,
      number_plain: target.number_plain,
      gv_id: target.gv_id,
      external_ids: {
        master_identity_graph_jpn: {
          supplemental_package_id: PACKAGE_ID,
          acquisition_key: acquisitionKey,
          source_keys: ['tcgcollector_jp', 'bulbapedia_pikachu_tcg'],
          source_urls: target.source_evidence.map((row) => row.source_url),
          source_number: target.source_number_key,
          preserved_number_occupant_count: target.existing_number_occupants_preserved.length,
        },
      },
      data_quality_flags: {
        master_identity_graph_jpn: {
          supplemental_package_id: PACKAGE_ID,
          acquisition_key: acquisitionKey,
          source: 'jpn_pikachu_promo_gap_audit_v1',
          transform: 'supplemental_two_source_pikachu_promo_insert_v1',
          existing_number_occupants_preserved: target.existing_number_occupants_preserved.length,
        },
      },
      printed_set_abbrev: printedSetAbbrev(target.set_code),
      identity_domain: 'pokemon_jpn',
      printed_identity_modifier: target.printed_identity_modifier,
      set_identity_model: 'standard',
      image_status: 'missing',
      image_source: null,
      image_note: 'Japanese Pikachu promo supplemental identity inserted without image pointer; image recovery pending.',
    });

    rows.card_print_identity.push({
      id: identityId,
      card_print_id: cardPrintId,
      identity_domain: 'pokemon_jpn',
      set_code_identity: target.set_code,
      printed_number: target.number_plain,
      normalized_printed_name: target.name,
      source_name_raw: target.name,
      identity_payload: {
        ...target.identity_payload,
        card_name_en_candidates: [target.name],
        card_name_ja_candidates: [],
        language_code: 'ja',
        language_scope: 'ja',
        normalized_family_name_candidates: ['pikachu'],
        release_context: {
          supplemental_package_id: PACKAGE_ID,
          source_canonical_set_key: printedSetAbbrev(target.set_code),
          source_keys: ['tcgcollector_jp', 'bulbapedia_pikachu_tcg'],
          source_number: target.source_number_key,
          set_code_identity: target.set_code,
        },
        source_count: 2,
      },
      identity_key_version: target.identity_key_version,
      identity_key_hash: target.identity_key_hash,
    });

    for (const source of target.source_evidence) {
      const sourceKey = source.source_key === 'tcgcollector' ? 'tcgcollector_jp' : source.source_key;
      const evidencePayload = {
        supplemental_package_id: PACKAGE_ID,
        gate_status: 'two_source_actionable',
        source_url: source.source_url,
        source_number: source.source_number,
        source_label: source.source_label,
        source_keys: sourceKeys,
        family_status: 'english_name_family_candidate',
        existing_number_occupants_preserved: target.existing_number_occupants_preserved.length,
      };
      rows.source_evidence.push({
        id: deterministicUuid(`${PACKAGE_ID}:evidence:${target.gv_id}:${sourceKey}`),
        card_print_identity_id: identityId,
        card_print_id: cardPrintId,
        acquisition_key: acquisitionKey,
        source_key: sourceKey,
        evidence_key_hash: sha256({ acquisitionKey, sourceKey, evidenceSubject, evidencePayload }),
        evidence_subject: evidenceSubject,
        evidence_payload: evidencePayload,
      });
    }

    rows.family_review.push({
      id: deterministicUuid(`${PACKAGE_ID}:family_review:${target.gv_id}`),
      card_print_identity_id: identityId,
      card_print_id: cardPrintId,
      acquisition_key: acquisitionKey,
      family_status: 'english_name_family_candidate',
      family_candidate_source: 'identity_resolution_candidate',
      normalized_family_candidate: 'pikachu',
      review_status: 'pending',
      family_link_promotion_allowed: false,
      review_key_hash: sha256({ acquisitionKey, cardPrintId, identityId, normalized_family_candidate: 'pikachu' }),
      evidence_subject: {
        ...evidenceSubject,
        source_keys: ['tcgcollector_jp', 'bulbapedia_pikachu_tcg'],
      },
    });
  }

  return rows;
}

async function fetchSetRows(client, setCodes) {
  const result = await client.query(
    `select id, code, name, source, printed_total
     from public.sets
     where code = any($1::text[])
     order by code`,
    [setCodes],
  );
  return result.rows;
}

async function computeIdentityHashes(client, identityRows) {
  const rows = [];
  for (const row of identityRows) {
    const result = await client.query(
      `select public.card_print_identity_hash_v1($1, $2, $3, $4, $5, $6, $7::jsonb) as hash`,
      [
        row.identity_domain,
        row.identity_key_version,
        row.set_code_identity,
        row.printed_number,
        row.normalized_printed_name,
        row.source_name_raw,
        JSON.stringify(row.identity_payload),
      ],
    );
    rows.push(result.rows[0].hash);
  }
  return rows;
}

async function capturePreflight(client, payload) {
  const gvIds = payload.card_prints.map((row) => row.gv_id);
  const identityHashes = payload.card_print_identity.map((row) => row.identity_key_hash);
  const cardPrintIds = payload.card_prints.map((row) => row.id);
  const identityIds = payload.card_print_identity.map((row) => row.id);
  const setCodes = [...new Set(payload.card_prints.map((row) => row.set_code))];

  const gvCollision = await client.query('select gv_id from public.card_prints where gv_id = any($1::text[]) order by gv_id', [gvIds]);
  const cardIdCollision = await client.query('select id from public.card_prints where id = any($1::uuid[]) order by id', [cardPrintIds]);
  const identityIdCollision = await client.query('select id from public.card_print_identity where id = any($1::uuid[]) order by id', [identityIds]);
  const identityHashCollision = await client.query(
      `select identity_key_hash
       from public.card_print_identity
       where identity_domain = 'pokemon_jpn'
         and identity_key_version = 'pokemon_jpn:v1'
         and identity_key_hash = any($1::text[])
         and is_active = true
       order by identity_key_hash`,
      [identityHashes],
  );
  const evidenceCollision = await client.query(
      `select source_key, acquisition_key
       from public.card_print_identity_source_evidence
       where card_print_identity_id = any($1::uuid[])
         and active = true
       order by source_key, acquisition_key`,
      [identityIds],
  );
  const reviewCollision = await client.query(
      `select family_candidate_source, normalized_family_candidate
       from public.card_print_family_review_queue
       where card_print_identity_id = any($1::uuid[])
         and active = true
       order by family_candidate_source, normalized_family_candidate`,
      [identityIds],
  );
  const standardKeyCollision = await client.query(
      `with proposed as (
         select *
         from jsonb_to_recordset($1::jsonb) as p(
           set_id uuid,
           number_plain text,
           printed_identity_modifier text,
           variant_key text
         )
       )
       select cp.gv_id, cp.set_code, cp.number_plain, cp.printed_identity_modifier
       from proposed p
       join public.card_prints cp
         on cp.set_id = p.set_id
        and cp.number_plain = p.number_plain
        and coalesce(cp.printed_identity_modifier, '') = coalesce(p.printed_identity_modifier, '')
        and coalesce(cp.variant_key, '') = coalesce(p.variant_key, '')
        and cp.set_identity_model = 'standard'
       order by cp.gv_id`,
      [JSON.stringify(payload.card_prints.map((row) => ({
        set_id: row.set_id,
        number_plain: row.number_plain,
        printed_identity_modifier: row.printed_identity_modifier,
        variant_key: null,
      })))],
  );

  return {
    set_codes: setCodes,
    gv_id_collisions: gvCollision.rows,
    deterministic_card_print_id_collisions: cardIdCollision.rows,
    deterministic_identity_id_collisions: identityIdCollision.rows,
    active_identity_hash_collisions: identityHashCollision.rows,
    source_evidence_collisions: evidenceCollision.rows,
    family_review_collisions: reviewCollision.rows,
    standard_identity_key_collisions: standardKeyCollision.rows,
  };
}

async function insertPayload(client, payload) {
  for (const row of payload.card_prints) {
    await client.query(
      `insert into public.card_prints (
         id, set_id, name, number, external_ids, data_quality_flags, set_code, printed_set_abbrev,
         gv_id, identity_domain, printed_identity_modifier, set_identity_model,
         image_status, image_source, image_note
       )
       values (
         $1::uuid, $2::uuid, $3, $4, $5::jsonb, $6::jsonb, $7, $8,
         $9, $10, $11, $12, $13, $14, $15
       )`,
      [
        row.id,
        row.set_id,
        row.name,
        row.number,
        JSON.stringify(row.external_ids),
        JSON.stringify(row.data_quality_flags),
        row.set_code,
        row.printed_set_abbrev,
        row.gv_id,
        row.identity_domain,
        row.printed_identity_modifier,
        row.set_identity_model,
        row.image_status,
        row.image_source,
        row.image_note,
      ],
    );
  }

  for (const row of payload.card_print_identity) {
    await client.query(
      `insert into public.card_print_identity (
         id, card_print_id, identity_domain, set_code_identity, printed_number,
         normalized_printed_name, source_name_raw, identity_payload,
         identity_key_version, identity_key_hash, is_active
       )
       values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, true)`,
      [
        row.id,
        row.card_print_id,
        row.identity_domain,
        row.set_code_identity,
        row.printed_number,
        row.normalized_printed_name,
        row.source_name_raw,
        JSON.stringify(row.identity_payload),
        row.identity_key_version,
        row.identity_key_hash,
      ],
    );
  }

  for (const row of payload.source_evidence) {
    await client.query(
      `insert into public.card_print_identity_source_evidence (
         id, card_print_identity_id, card_print_id, acquisition_key, source_key,
         evidence_key_hash, evidence_subject, evidence_payload, active
       )
       values ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::jsonb, $8::jsonb, true)`,
      [
        row.id,
        row.card_print_identity_id,
        row.card_print_id,
        row.acquisition_key,
        row.source_key,
        row.evidence_key_hash,
        JSON.stringify(row.evidence_subject),
        JSON.stringify(row.evidence_payload),
      ],
    );
  }

  for (const row of payload.family_review) {
    await client.query(
      `insert into public.card_print_family_review_queue (
         id, card_print_identity_id, card_print_id, acquisition_key, family_status,
         family_candidate_source, normalized_family_candidate, review_status,
         family_link_promotion_allowed, review_key_hash, evidence_subject, active
       )
       values ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, false, $9, $10::jsonb, true)`,
      [
        row.id,
        row.card_print_identity_id,
        row.card_print_id,
        row.acquisition_key,
        row.family_status,
        row.family_candidate_source,
        row.normalized_family_candidate,
        row.review_status,
        row.review_key_hash,
        JSON.stringify(row.evidence_subject),
      ],
    );
  }
}

async function countInsertedRows(client, payload) {
  const cardPrintIds = payload.card_prints.map((row) => row.id);
  const identityIds = payload.card_print_identity.map((row) => row.id);
  const evidenceIds = payload.source_evidence.map((row) => row.id);
  const reviewIds = payload.family_review.map((row) => row.id);

  const cardPrints = await client.query(
    'select count(*)::int as count from public.card_prints where id = any($1::uuid[])',
    [cardPrintIds],
  );
  const identities = await client.query(
    'select count(*)::int as count from public.card_print_identity where id = any($1::uuid[])',
    [identityIds],
  );
  const evidence = await client.query(
    'select count(*)::int as count from public.card_print_identity_source_evidence where id = any($1::uuid[])',
    [evidenceIds],
  );
  const review = await client.query(
    'select count(*)::int as count from public.card_print_family_review_queue where id = any($1::uuid[])',
    [reviewIds],
  );

  return {
    card_prints: cardPrints.rows[0].count,
    card_print_identity: identities.rows[0].count,
    source_evidence: evidence.rows[0].count,
    family_review: review.rows[0].count,
  };
}

function validatePreflight(preflight, payload, hashCheck) {
  const findings = [];
  for (const [key, rows] of Object.entries(preflight)) {
    if (key === 'set_codes') continue;
    if (Array.isArray(rows) && rows.length > 0) findings.push(`${key}_present`);
  }
  if (hashCheck.mismatches.length > 0) findings.push('identity_hash_mismatches_present');
  if (payload.card_prints.length !== 134) findings.push('card_print_payload_count_not_134');
  if (payload.card_print_identity.length !== 134) findings.push('identity_payload_count_not_134');
  if (payload.source_evidence.length !== 268) findings.push('source_evidence_payload_count_not_268');
  if (payload.family_review.length !== 134) findings.push('family_review_payload_count_not_134');
  return findings;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Japanese Pikachu Promo First Batch Real Apply v1');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push(`- Mode: \`${report.mode}\``);
  lines.push(`- Apply status: \`${report.apply_status}\``);
  lines.push(`- Payload fingerprint: \`${report.payload_fingerprint_sha256}\``);
  lines.push(`- Dry-run source fingerprint: \`${report.source_dry_run_fingerprint_sha256}\``);
  lines.push(`- Stop findings: ${report.stop_findings.length}`);
  lines.push(`- Committed: ${report.committed}`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push(`- Parent card_print inserts: ${report.counts.card_prints}`);
  lines.push(`- card_print_identity inserts: ${report.counts.card_print_identity}`);
  lines.push(`- source evidence inserts: ${report.counts.source_evidence}`);
  lines.push(`- family review inserts: ${report.counts.family_review}`);
  lines.push('- No English mutation, no public child card_printings, no image writes, no family promotion, no cleanup, no deletes.');
  lines.push('');
  lines.push('## Transaction Proof');
  lines.push('');
  lines.push(`- Transaction inserted rows before ${report.mode === 'apply' ? 'commit' : 'rollback'}: ${JSON.stringify(report.transaction_insert_counts)}`);
  lines.push(`- Durable post-transaction inserted rows: ${JSON.stringify(report.durable_post_transaction_counts)}`);
  lines.push('');
  lines.push('## Approval Message');
  lines.push('');
  lines.push('```text');
  lines.push(report.required_approval_message);
  lines.push('```');
  lines.push('');
  if (report.stop_findings.length > 0) {
    lines.push('## Stop Findings');
    lines.push('');
    for (const finding of report.stop_findings) lines.push(`- ${finding}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const applyMode = process.argv.includes('--apply');
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');

  const dryRun = JSON.parse(await fs.readFile(DRY_RUN_JSON, 'utf8'));
  if (dryRun.package_id !== PACKAGE_ID) throw new Error(`Unexpected package_id: ${dryRun.package_id}`);

  const client = new Client({ connectionString: conn });
  await client.connect();

  let committed = false;
  let transactionInsertCounts = null;
  let durablePostTransactionCounts = null;

  try {
    const setCodes = [...new Set(dryRun.targets.map((target) => target.set_code))];
    const setRows = await fetchSetRows(client, setCodes);
    const payload = buildPayload(dryRun, setRows);
    const dbHashes = await computeIdentityHashes(client, payload.card_print_identity);
    payload.card_print_identity.forEach((row, index) => {
      row.identity_key_hash = dbHashes[index];
    });
    const hashCheck = {
      mismatches: payload.card_print_identity
        .map((row, index) => ({ gv_id: payload.card_prints[index].gv_id, expected: row.identity_key_hash, actual: dbHashes[index] }))
        .filter((row) => row.expected !== row.actual),
    };
    const preflight = await capturePreflight(client, payload);
    const payloadFingerprint = sha256({
      package_id: PACKAGE_ID,
      source_dry_run_fingerprint_sha256: dryRun.payload_fingerprint_sha256,
      rows: payload,
    });
    const requiredApprovalMessage = `I approve applying the Japanese Pikachu promo first-batch master identity payload only: 134 parent card_print rows, 134 card_print_identity rows, 268 source evidence rows, and 134 family review rows, using payload fingerprint ${payloadFingerprint} and dry-run source fingerprint ${dryRun.payload_fingerprint_sha256}. I do not approve English mutation, non-JPN mutation, public child card_printing writes, image writes, family promotion, cleanup, quarantine, deletion, truncation, migrations, public gv_id changes outside this package, price writes, or any rows outside this Japanese Pikachu promo first-batch payload.`;
    const approvalProvided = process.env.JPN_PIKACHU_PROMO_FIRST_BATCH_APPROVAL ?? '';
    const stopFindings = validatePreflight(preflight, payload, hashCheck);

    if (applyMode && approvalProvided !== requiredApprovalMessage) {
      stopFindings.push('exact_approval_message_not_present_in_JPN_PIKACHU_PROMO_FIRST_BATCH_APPROVAL');
    }

    let applyStatus = stopFindings.length === 0
      ? applyMode
        ? 'ready_for_apply'
        : 'rollback_dry_run_ready'
      : 'blocked_before_transaction';

    if (stopFindings.length === 0) {
      await client.query('begin');
      try {
        await client.query("set local lock_timeout = '5s'");
        await client.query("set local statement_timeout = '60s'");
        await insertPayload(client, payload);
        transactionInsertCounts = await countInsertedRows(client, payload);

        const expectedCounts = {
          card_prints: payload.card_prints.length,
          card_print_identity: payload.card_print_identity.length,
          source_evidence: payload.source_evidence.length,
          family_review: payload.family_review.length,
        };
        if (stableJson(transactionInsertCounts) !== stableJson(expectedCounts)) {
          throw new Error(`transaction insert count mismatch: ${JSON.stringify(transactionInsertCounts)}`);
        }

        if (applyMode) {
          await client.query('commit');
          committed = true;
          applyStatus = 'applied_committed';
        } else {
          await client.query('rollback');
          applyStatus = 'rollback_dry_run_passed_no_durable_change';
        }
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    }

    durablePostTransactionCounts = await countInsertedRows(client, payload);
    const report = {
      generated_at: new Date().toISOString(),
      package_id: PACKAGE_ID,
      mode: applyMode ? 'apply' : 'rollback_dry_run',
      apply_status: applyStatus,
      committed,
      source_dry_run_path: DRY_RUN_JSON.replaceAll('\\', '/'),
      source_dry_run_fingerprint_sha256: dryRun.payload_fingerprint_sha256,
      payload_fingerprint_sha256: payloadFingerprint,
      counts: {
        card_prints: payload.card_prints.length,
        card_print_identity: payload.card_print_identity.length,
        source_evidence: payload.source_evidence.length,
        family_review: payload.family_review.length,
      },
      by_set: dryRun.by_set,
      preflight,
      identity_hash_check: hashCheck,
      transaction_insert_counts: transactionInsertCounts,
      durable_post_transaction_counts: durablePostTransactionCounts,
      required_approval_message: requiredApprovalMessage,
      explicit_non_authorizations: [
        'No English mutation.',
        'No non-JPN mutation.',
        'No public child card_printing writes.',
        'No image writes.',
        'No family promotion.',
        'No cleanup, quarantine, deletion, truncation, or migrations.',
        'No price writes.',
      ],
      stop_findings: stopFindings,
      sample_targets: payload.card_prints.slice(0, 20).map((row) => ({
        gv_id: row.gv_id,
        name: row.name,
        set_code: row.set_code,
        number_plain: row.number_plain,
        printed_identity_modifier: row.printed_identity_modifier,
      })),
      pass: stopFindings.length === 0 && (
        applyMode
          ? committed && durablePostTransactionCounts.card_prints === payload.card_prints.length
          : !committed && durablePostTransactionCounts.card_prints === 0
      ),
    };

    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(OUTPUT_MD, renderMarkdown(report));

    console.log(JSON.stringify({
      status: report.apply_status,
      mode: report.mode,
      committed: report.committed,
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      payload_fingerprint_sha256: report.payload_fingerprint_sha256,
      source_dry_run_fingerprint_sha256: report.source_dry_run_fingerprint_sha256,
      stop_findings: report.stop_findings,
      pass: report.pass,
    }, null, 2));

    if (!report.pass) process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
