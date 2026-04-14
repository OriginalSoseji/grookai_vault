import '../env.mjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const PHASE = 'G1_RC_PREFIX_EXACT_TOKEN_PROMOTION_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const TARGET_SET_CODE = 'g1';
const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const EXPECTED_PRINTED_SET_ABBREV = 'GEN';
const TMP_MAP = 'tmp_g1_rc_prefix_exact_token_promotion_map_v1';
const BACKUP_SCHEMA_PATH = path.resolve('backups', 'g1_rc_prefix_exact_token_promotion_preapply_schema.sql');
const BACKUP_DATA_PATH = path.resolve('backups', 'g1_rc_prefix_exact_token_promotion_preapply_data.sql');

const EXPECTED_ROWS = [
  { old_id: '708b039d-efca-4744-aedf-65e6c82a6d25', old_printed_token: 'RC2', source_variant_key: '', new_gv_id: 'GV-PK-GEN-RC2' },
  { old_id: '3ad8de82-2862-4194-96ae-2d43a3e41b14', old_printed_token: 'RC3', source_variant_key: '', new_gv_id: 'GV-PK-GEN-RC3' },
  { old_id: '6d5677ae-0337-4f82-baab-3b7a3921a031', old_printed_token: 'RC5', source_variant_key: '', new_gv_id: 'GV-PK-GEN-RC5' },
  { old_id: '8ca0294e-ada1-4a3f-b1fe-eb4a4fd10750', old_printed_token: 'RC7', source_variant_key: '', new_gv_id: 'GV-PK-GEN-RC7' },
  { old_id: 'f5a11553-b2f7-425c-8b4b-f422737dfb68', old_printed_token: 'RC8', source_variant_key: '', new_gv_id: 'GV-PK-GEN-RC8' },
  { old_id: '6334f5d9-24e6-48d7-8823-306116d5f96d', old_printed_token: 'RC12', source_variant_key: '', new_gv_id: 'GV-PK-GEN-RC12' },
  { old_id: 'f18339d6-1831-4674-9670-074c3a2fd654', old_printed_token: 'RC13', source_variant_key: '', new_gv_id: 'GV-PK-GEN-RC13' },
  { old_id: 'b3e323e4-9be5-46d0-afd2-608a20212841', old_printed_token: 'RC14', source_variant_key: '', new_gv_id: 'GV-PK-GEN-RC14' },
  { old_id: 'e1434f2c-9e83-41ab-907f-687a05deeddf', old_printed_token: 'RC16', source_variant_key: '', new_gv_id: 'GV-PK-GEN-RC16' },
  { old_id: 'f92324a2-6e79-497b-a2ef-0dd1f87a1dcc', old_printed_token: 'RC17', source_variant_key: '', new_gv_id: 'GV-PK-GEN-RC17' },
  { old_id: '7fa534ce-e63c-4c5c-8d58-bbdc5881e240', old_printed_token: 'RC18', source_variant_key: '', new_gv_id: 'GV-PK-GEN-RC18' },
  { old_id: '84034d9b-e2e3-48b8-9c03-6d92f67ef527', old_printed_token: 'RC19', source_variant_key: '', new_gv_id: 'GV-PK-GEN-RC19' },
  { old_id: '424ad8ec-c185-48d5-8ce4-9b0a24ccc0d0', old_printed_token: 'RC20', source_variant_key: '', new_gv_id: 'GV-PK-GEN-RC20' },
  { old_id: 'bbb281fa-3cf3-4989-8c6b-2cab82b8bcac', old_printed_token: 'RC23', source_variant_key: '', new_gv_id: 'GV-PK-GEN-RC23' },
  { old_id: '8a1eddc6-0161-4e99-bfd3-206a956161ee', old_printed_token: 'RC25', source_variant_key: '', new_gv_id: 'GV-PK-GEN-RC25' },
  { old_id: '061fc3b1-6b96-4eb0-b8ef-c4d3193e847b', old_printed_token: 'RC30', source_variant_key: '', new_gv_id: 'GV-PK-GEN-RC30' },
];

const EXPECTED = {
  source_count: 16,
  unresolved_count_before: 16,
  canonical_count_before: 100,
  canonical_count_delta: 16,
};

const EXPECTED_BY_ID = new Map(EXPECTED_ROWS.map((row) => [row.old_id, row]));
const SUPPORTED_REFERENCE_TABLES = new Set([
  'card_print_identity.card_print_id',
  'card_print_traits.card_print_id',
  'card_printings.card_print_id',
  'external_mappings.card_print_id',
  'vault_items.card_id',
]);

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCount(value) {
  return Number(value ?? 0);
}

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function deterministicUuidFromSeed(seed) {
  const hex = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex.slice(12, 16).join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20, 32).join('')}`;
}

function isRcToken(value) {
  return /^RC[0-9]+$/i.test(String(value ?? '').trim());
}

function extractRcNumberPlain(token) {
  const normalized = normalizeTextOrNull(token)?.toUpperCase() ?? '';
  if (!isRcToken(normalized)) {
    throw new Error(`INVALID_RC_TOKEN:${token}`);
  }
  const digits = normalized.replace(/^RC/, '');
  if (!digits) {
    throw new Error(`RC_TOKEN_MISSING_DIGITS:${token}`);
  }
  return digits;
}

function comparePrintedTokens(left, right) {
  const a = normalizeTextOrNull(left)?.toUpperCase() ?? '';
  const b = normalizeTextOrNull(right)?.toUpperCase() ?? '';
  const aDigits = extractRcNumberPlain(a);
  const bDigits = extractRcNumberPlain(b);
  const aNumber = Number.parseInt(aDigits, 10);
  const bNumber = Number.parseInt(bDigits, 10);
  if (aNumber !== bNumber) return aNumber - bNumber;
  return a.localeCompare(b);
}

function sortByToken(left, right) {
  const tokenOrder = comparePrintedTokens(left.old_printed_token, right.old_printed_token);
  if (tokenOrder !== 0) return tokenOrder;
  return String(left.old_id).localeCompare(String(right.old_id));
}

function deriveRcLaneGvId(setMetadata, oldPrintedToken) {
  const token = normalizeTextOrNull(oldPrintedToken)?.toUpperCase() ?? '';
  if (!isRcToken(token)) {
    throw new Error(`NON_RC_TOKEN_IN_SCOPE:${oldPrintedToken}`);
  }
  const printedSetAbbrev = normalizeTextOrNull(setMetadata.printed_set_abbrev);
  if (printedSetAbbrev !== EXPECTED_PRINTED_SET_ABBREV) {
    throw new Error(`PRINTED_SET_ABBREV_DRIFT:${printedSetAbbrev}:${EXPECTED_PRINTED_SET_ABBREV}`);
  }
  return `GV-PK-${printedSetAbbrev}-${token}`;
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function queryOne(client, sql, params = []) {
  const rows = await queryRows(client, sql, params);
  return rows[0] ?? null;
}

async function loadSetMetadata(client) {
  const row = await queryOne(
    client,
    `
      select id, code, name, printed_set_abbrev
      from public.sets
      where code = $1
    `,
    [TARGET_SET_CODE],
  );

  if (!row) {
    throw new Error(`TARGET_SET_NOT_FOUND:${TARGET_SET_CODE}`);
  }

  if (!normalizeTextOrNull(row.printed_set_abbrev)) {
    throw new Error(`PRINTED_SET_ABBREV_MISSING:${TARGET_SET_CODE}`);
  }

  return row;
}

async function loadSourceRows(client, setId) {
  return queryRows(
    client,
    `
      select
        cp.id as old_parent_id,
        cp.game_id,
        cp.set_id,
        s.code as set_code,
        s.printed_set_abbrev as set_printed_set_abbrev,
        cp.name as old_name,
        coalesce(cp.variant_key, '') as variant_key,
        cp.rarity,
        cp.image_url,
        cp.tcgplayer_id,
        cp.external_ids,
        cp.artist,
        cp.regulation_mark,
        cp.image_alt_url,
        cp.image_source,
        cp.variants,
        cp.created_at,
        cp.last_synced_at,
        cp.print_identity_key,
        cp.ai_metadata,
        cp.image_hash,
        cp.data_quality_flags,
        cp.image_status,
        cp.image_res,
        cp.image_last_checked_at,
        cp.printed_set_abbrev,
        cp.printed_total,
        cp.image_path,
        cp.identity_domain,
        cp.printed_identity_modifier,
        upper(coalesce(cpi.printed_number, cp.number)) as old_printed_token,
        nullif(regexp_replace(upper(coalesce(cpi.printed_number, cp.number)), '[^0-9]', '', 'g'), '') as proposed_number_plain
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      join public.sets s
        on s.id = cp.set_id
      where cp.set_id = $1
        and cpi.identity_domain = $2
        and cpi.set_code_identity = $3
        and cpi.is_active = true
        and cp.gv_id is null
        and upper(coalesce(cpi.printed_number, cp.number)) ~ '^RC[0-9]+$'
      order by upper(coalesce(cpi.printed_number, cp.number)), cp.id
    `,
    [setId, TARGET_IDENTITY_DOMAIN, TARGET_SET_CODE],
  );
}

async function loadUnresolvedCount(client, setId) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as row_count
      from public.card_prints
      where set_id = $1
        and gv_id is null
    `,
    [setId],
  );

  return normalizeCount(row?.row_count);
}

async function loadCanonicalCount(client, setId) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as row_count
      from public.card_prints
      where set_id = $1
        and gv_id is not null
    `,
    [setId],
  );

  return normalizeCount(row?.row_count);
}

function buildSourceScopeDiffs(sourceRows) {
  const diffs = [];
  const liveById = new Map(sourceRows.map((row) => [row.old_parent_id, row]));

  for (const expected of EXPECTED_ROWS) {
    const liveRow = liveById.get(expected.old_id);
    if (!liveRow) {
      diffs.push({
        type: 'missing',
        old_id: expected.old_id,
        expected_token: expected.old_printed_token,
      });
      continue;
    }

    if ((normalizeTextOrNull(liveRow.variant_key) ?? '') !== expected.source_variant_key) {
      diffs.push({
        type: 'variant_key_mismatch',
        old_id: expected.old_id,
        expected_variant_key: expected.source_variant_key,
        live_variant_key: normalizeTextOrNull(liveRow.variant_key) ?? '',
      });
    }

    const liveToken = normalizeTextOrNull(liveRow.old_printed_token)?.toUpperCase() ?? '';
    if (liveToken !== expected.old_printed_token) {
      diffs.push({
        type: 'token_mismatch',
        old_id: expected.old_id,
        expected_token: expected.old_printed_token,
        live_token: liveToken,
      });
    }
  }

  for (const liveRow of sourceRows) {
    if (!EXPECTED_BY_ID.has(liveRow.old_parent_id)) {
      diffs.push({
        type: 'unexpected',
        old_id: liveRow.old_parent_id,
        live_name: liveRow.old_name,
        live_token: liveRow.old_printed_token,
      });
    }
  }

  return diffs;
}

function buildCandidateMap(sourceRows, setMetadata) {
  return sourceRows
    .map((row) => {
      const expected = EXPECTED_BY_ID.get(row.old_parent_id);
      if (!expected) {
        throw new Error(`UNEXPECTED_SOURCE_ROW:${row.old_parent_id}`);
      }

      const oldPrintedToken = normalizeTextOrNull(row.old_printed_token)?.toUpperCase();
      if (!isRcToken(oldPrintedToken)) {
        throw new Error(`NON_RC_TOKEN_IN_SCOPE:${row.old_parent_id}:${row.old_printed_token}`);
      }

      const proposedNumberPlain = extractRcNumberPlain(oldPrintedToken);
      if (proposedNumberPlain !== row.proposed_number_plain) {
        throw new Error(`PROPOSED_NUMBER_PLAIN_DRIFT:${row.old_parent_id}:${row.proposed_number_plain}:${proposedNumberPlain}`);
      }

      const newGvId = deriveRcLaneGvId(setMetadata, oldPrintedToken);
      if (newGvId !== expected.new_gv_id) {
        throw new Error(`GV_ID_EXPECTATION_MISMATCH:${row.old_parent_id}:${expected.new_gv_id}:${newGvId}`);
      }

      return {
        old_id: row.old_parent_id,
        old_name: row.old_name,
        old_printed_token: oldPrintedToken,
        new_id: deterministicUuidFromSeed(`${PHASE}:${row.old_parent_id}`),
        new_gv_id: newGvId,
        set_id: row.set_id,
        game_id: row.game_id,
        proposed_name: row.old_name,
        proposed_number: oldPrintedToken,
        proposed_number_plain: proposedNumberPlain,
        proposed_variant_key: 'rc',
        rarity: row.rarity,
        image_url: row.image_url,
        tcgplayer_id: row.tcgplayer_id,
        external_ids: row.external_ids,
        artist: row.artist,
        regulation_mark: row.regulation_mark,
        image_alt_url: row.image_alt_url,
        image_source: row.image_source,
        variants: row.variants,
        created_at: row.created_at,
        last_synced_at: row.last_synced_at,
        print_identity_key: row.print_identity_key,
        ai_metadata: row.ai_metadata,
        image_hash: row.image_hash,
        data_quality_flags: row.data_quality_flags,
        image_status: row.image_status,
        image_res: row.image_res,
        image_last_checked_at: row.image_last_checked_at,
        printed_set_abbrev: normalizeTextOrNull(row.printed_set_abbrev) ?? setMetadata.printed_set_abbrev,
        printed_total: row.printed_total,
        image_path: row.image_path,
        identity_domain: row.identity_domain,
        printed_identity_modifier: row.printed_identity_modifier,
      };
    })
    .sort(sortByToken);
}

function buildDuplicatePrintedTokens(sourceRows) {
  const counts = new Map();
  for (const row of sourceRows) {
    const token = normalizeTextOrNull(row.old_printed_token)?.toUpperCase() ?? '';
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, rowCount]) => rowCount > 1)
    .map(([old_printed_token, row_count]) => ({ old_printed_token, row_count }));
}

function buildDuplicateProposedKeys(candidateMap) {
  const counts = new Map();
  for (const row of candidateMap) {
    const key = JSON.stringify({
      set_id: row.set_id,
      proposed_number_plain: row.proposed_number_plain,
      proposed_variant_key: row.proposed_variant_key,
      printed_identity_modifier: normalizeTextOrNull(row.printed_identity_modifier) ?? '',
    });
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, rowCount]) => rowCount > 1)
    .map(([key, row_count]) => ({ key, row_count }));
}

function buildDuplicateNewIds(candidateMap) {
  const counts = new Map();
  for (const row of candidateMap) {
    counts.set(row.new_id, (counts.get(row.new_id) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, rowCount]) => rowCount > 1)
    .map(([new_id, row_count]) => ({ new_id, row_count }));
}

async function loadLiveNewIdCollisions(client, candidateMap) {
  if (candidateMap.length === 0) return [];

  return queryRows(
    client,
    `
      select id, gv_id, set_code, name, number
      from public.card_prints
      where id = any($1::uuid[])
      order by id
    `,
    [candidateMap.map((row) => row.new_id)],
  );
}

async function loadLiveGvIdCollisions(client, candidateMap) {
  if (candidateMap.length === 0) return [];

  return queryRows(
    client,
    `
      select id, gv_id, set_code, name, number
      from public.card_prints
      where gv_id = any($1::text[])
      order by gv_id, id
    `,
    [candidateMap.map((row) => row.new_gv_id)],
  );
}

async function loadLiveIdentityKeyCollisions(client, candidateMap) {
  if (candidateMap.length === 0) return [];

  const payload = JSON.stringify(
    candidateMap.map((row) => ({
      old_id: row.old_id,
      set_id: row.set_id,
      proposed_number_plain: row.proposed_number_plain,
      proposed_variant_key: row.proposed_variant_key,
    })),
  );

  return queryRows(
    client,
    `
      select
        payload.old_id,
        cp.id as collision_target_id,
        cp.gv_id as collision_target_gv_id,
        cp.set_code as collision_target_set_code,
        cp.name as collision_target_name,
        cp.number as collision_target_number
      from jsonb_to_recordset($1::jsonb) as payload(
        old_id uuid,
        set_id uuid,
        proposed_number_plain text,
        proposed_variant_key text
      )
      join public.card_prints cp
        on cp.set_id = payload.set_id
       and cp.gv_id is not null
       and cp.number_plain = payload.proposed_number_plain
       and coalesce(cp.variant_key, '') = coalesce(payload.proposed_variant_key, '')
       and cp.id <> payload.old_id
      order by payload.old_id, cp.id
    `,
    [payload],
  );
}

async function loadLiveExactTokenCollisions(client, candidateMap) {
  if (candidateMap.length === 0) return [];

  const payload = JSON.stringify(
    candidateMap.map((row) => ({
      old_id: row.old_id,
      set_id: row.set_id,
      proposed_number: row.proposed_number,
    })),
  );

  return queryRows(
    client,
    `
      select
        payload.old_id,
        cp.id as collision_target_id,
        cp.gv_id as collision_target_gv_id,
        cp.name as collision_target_name,
        cp.number as collision_target_number,
        cp.number_plain as collision_target_number_plain
      from jsonb_to_recordset($1::jsonb) as payload(
        old_id uuid,
        set_id uuid,
        proposed_number text
      )
      join public.card_prints cp
        on cp.set_id = payload.set_id
       and cp.gv_id is not null
       and cp.number = payload.proposed_number
       and cp.id <> payload.old_id
      order by payload.old_id, cp.id
    `,
    [payload],
  );
}

async function loadCardPrintFkInventory(client) {
  return queryRows(
    client,
    `
      select distinct
        rel.relname as table_name,
        att.attname as column_name
      from pg_constraint c
      join pg_class rel on rel.oid = c.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
      join pg_class frel on frel.oid = c.confrelid
      join pg_namespace fn on fn.oid = frel.relnamespace
      join unnest(c.conkey) with ordinality as k(attnum, ord) on true
      join pg_attribute att on att.attrelid = rel.oid and att.attnum = k.attnum
      where c.contype = 'f'
        and n.nspname = 'public'
        and fn.nspname = 'public'
        and frel.relname = 'card_prints'
      order by rel.relname, att.attname
    `,
  );
}

async function loadFkCounts(client, fkInventory, sourceClause, params = []) {
  const counts = [];

  for (const fk of fkInventory) {
    const row = await queryOne(
      client,
      `
        select count(*)::int as row_count
        from public.${quoteIdent(fk.table_name)}
        where ${quoteIdent(fk.column_name)} in (${sourceClause})
      `,
      params,
    );

    counts.push({
      table_name: fk.table_name,
      column_name: fk.column_name,
      row_count: normalizeCount(row?.row_count),
      supported_handler: SUPPORTED_REFERENCE_TABLES.has(`${fk.table_name}.${fk.column_name}`),
    });
  }

  return counts;
}

function assertNoUnexpectedReferencedTables(fkCounts) {
  const unexpected = fkCounts.filter((row) => row.row_count > 0 && !row.supported_handler);
  if (unexpected.length > 0) {
    throw new Error(`UNSUPPORTED_REFERENCING_TABLES:${JSON.stringify(unexpected)}`);
  }
}

async function loadSupportedFkCounts(client, oldIds) {
  if (oldIds.length === 0) {
    return {
      card_print_identity: 0,
      card_print_traits: 0,
      card_printings: 0,
      external_mappings: 0,
      vault_items: 0,
    };
  }

  const row = await queryOne(
    client,
    `
      select
        (select count(*)::int from public.card_print_identity where card_print_id = any($1::uuid[])) as card_print_identity,
        (select count(*)::int from public.card_print_traits where card_print_id = any($1::uuid[])) as card_print_traits,
        (select count(*)::int from public.card_printings where card_print_id = any($1::uuid[])) as card_printings,
        (select count(*)::int from public.external_mappings where card_print_id = any($1::uuid[])) as external_mappings,
        (select count(*)::int from public.vault_items where card_id = any($1::uuid[])) as vault_items
    `,
    [oldIds],
  );

  return {
    card_print_identity: normalizeCount(row?.card_print_identity),
    card_print_traits: normalizeCount(row?.card_print_traits),
    card_printings: normalizeCount(row?.card_printings),
    external_mappings: normalizeCount(row?.external_mappings),
    vault_items: normalizeCount(row?.vault_items),
  };
}

function buildPreconditions({
  unresolvedCountBefore,
  canonicalCountBefore,
  sourceRows,
  sourceScopeDiffs,
  duplicatePrintedTokens,
  duplicateProposedKeys,
  duplicateNewIds,
  liveExactTokenCollisions,
  liveIdentityKeyCollisions,
  liveNewIdCollisions,
  liveGvIdCollisions,
}) {
  const stopReasons = [];

  if (unresolvedCountBefore !== EXPECTED.unresolved_count_before) {
    stopReasons.push(`UNRESOLVED_COUNT_BEFORE:${unresolvedCountBefore}`);
  }
  if (canonicalCountBefore !== EXPECTED.canonical_count_before) {
    stopReasons.push(`CANONICAL_COUNT_BEFORE:${canonicalCountBefore}`);
  }
  if (sourceRows.length !== EXPECTED.source_count) {
    stopReasons.push(`SOURCE_COUNT:${sourceRows.length}`);
  }
  if (sourceScopeDiffs.length > 0) {
    stopReasons.push(`SOURCE_SCOPE_DRIFT:${sourceScopeDiffs.length}`);
  }
  if (duplicatePrintedTokens.length > 0) {
    stopReasons.push(`DUPLICATE_PRINTED_TOKENS:${duplicatePrintedTokens.length}`);
  }
  if (duplicateProposedKeys.length > 0) {
    stopReasons.push(`DUPLICATE_PROPOSED_KEYS:${duplicateProposedKeys.length}`);
  }
  if (duplicateNewIds.length > 0) {
    stopReasons.push(`DUPLICATE_NEW_IDS:${duplicateNewIds.length}`);
  }
  if (liveExactTokenCollisions.length > 0) {
    stopReasons.push(`LIVE_EXACT_TOKEN_COLLISIONS:${liveExactTokenCollisions.length}`);
  }
  if (liveIdentityKeyCollisions.length > 0) {
    stopReasons.push(`LIVE_IDENTITY_KEY_COLLISIONS:${liveIdentityKeyCollisions.length}`);
  }
  if (liveNewIdCollisions.length > 0) {
    stopReasons.push(`LIVE_NEW_ID_COLLISIONS:${liveNewIdCollisions.length}`);
  }
  if (liveGvIdCollisions.length > 0) {
    stopReasons.push(`LIVE_GVID_COLLISIONS:${liveGvIdCollisions.length}`);
  }

  return {
    unresolved_count_before: unresolvedCountBefore,
    canonical_count_before: canonicalCountBefore,
    source_count: sourceRows.length,
    duplicate_printed_token_count: duplicatePrintedTokens.length,
    duplicate_proposed_key_count: duplicateProposedKeys.length,
    duplicate_new_id_count: duplicateNewIds.length,
    live_exact_token_collision_count: liveExactTokenCollisions.length,
    live_identity_key_collision_count: liveIdentityKeyCollisions.length,
    live_new_id_collision_count: liveNewIdCollisions.length,
    live_gvid_collision_count: liveGvIdCollisions.length,
    safe_to_apply: stopReasons.length === 0,
    stop_reasons: stopReasons,
  };
}

function assertPreconditions(preconditions) {
  if (!preconditions.safe_to_apply) {
    throw new Error(`HARD_GATE_FAILED:${preconditions.stop_reasons.join('|')}`);
  }
}

async function createTempPromotionMap(client, candidateMap) {
  await client.query(`
    drop table if exists ${TMP_MAP};

    create temp table ${TMP_MAP} (
      seq int not null,
      old_id uuid not null,
      old_name text not null,
      old_printed_token text not null,
      new_id uuid not null,
      new_gv_id text not null,
      set_id uuid not null,
      game_id uuid null,
      proposed_name text not null,
      proposed_number text not null,
      proposed_number_plain text not null,
      proposed_variant_key text not null,
      rarity text null,
      image_url text null,
      tcgplayer_id text null,
      external_ids jsonb null,
      artist text null,
      regulation_mark text null,
      image_alt_url text null,
      image_source text null,
      variants jsonb null,
      created_at timestamptz null,
      last_synced_at timestamptz null,
      print_identity_key text null,
      ai_metadata jsonb null,
      image_hash text null,
      data_quality_flags jsonb null,
      image_status text null,
      image_res jsonb null,
      image_last_checked_at timestamptz null,
      printed_set_abbrev text null,
      printed_total integer null,
      image_path text null,
      identity_domain text null,
      printed_identity_modifier text null
    ) on commit drop;

    create unique index tmp_g1_rc_prefix_exact_token_promotion_map_v1_old_uidx on ${TMP_MAP} (old_id);
    create unique index tmp_g1_rc_prefix_exact_token_promotion_map_v1_new_uidx on ${TMP_MAP} (new_id);
    create unique index tmp_g1_rc_prefix_exact_token_promotion_map_v1_gvid_uidx on ${TMP_MAP} (new_gv_id);
  `);

  const payload = JSON.stringify(
    candidateMap.map((row, index) => ({
      seq: index + 1,
      ...row,
    })),
  );

  await client.query(
    `
      insert into ${TMP_MAP} (
        seq,
        old_id,
        old_name,
        old_printed_token,
        new_id,
        new_gv_id,
        set_id,
        game_id,
        proposed_name,
        proposed_number,
        proposed_number_plain,
        proposed_variant_key,
        rarity,
        image_url,
        tcgplayer_id,
        external_ids,
        artist,
        regulation_mark,
        image_alt_url,
        image_source,
        variants,
        created_at,
        last_synced_at,
        print_identity_key,
        ai_metadata,
        image_hash,
        data_quality_flags,
        image_status,
        image_res,
        image_last_checked_at,
        printed_set_abbrev,
        printed_total,
        image_path,
        identity_domain,
        printed_identity_modifier
      )
      select
        payload.seq,
        payload.old_id,
        payload.old_name,
        payload.old_printed_token,
        payload.new_id,
        payload.new_gv_id,
        payload.set_id,
        payload.game_id,
        payload.proposed_name,
        payload.proposed_number,
        payload.proposed_number_plain,
        payload.proposed_variant_key,
        payload.rarity,
        payload.image_url,
        payload.tcgplayer_id,
        payload.external_ids,
        payload.artist,
        payload.regulation_mark,
        payload.image_alt_url,
        payload.image_source,
        payload.variants,
        payload.created_at,
        payload.last_synced_at,
        payload.print_identity_key,
        payload.ai_metadata,
        payload.image_hash,
        payload.data_quality_flags,
        payload.image_status,
        payload.image_res,
        payload.image_last_checked_at,
        payload.printed_set_abbrev,
        payload.printed_total,
        payload.image_path,
        payload.identity_domain,
        payload.printed_identity_modifier
      from jsonb_to_recordset($1::jsonb) as payload(
        seq int,
        old_id uuid,
        old_name text,
        old_printed_token text,
        new_id uuid,
        new_gv_id text,
        set_id uuid,
        game_id uuid,
        proposed_name text,
        proposed_number text,
        proposed_number_plain text,
        proposed_variant_key text,
        rarity text,
        image_url text,
        tcgplayer_id text,
        external_ids jsonb,
        artist text,
        regulation_mark text,
        image_alt_url text,
        image_source text,
        variants jsonb,
        created_at timestamptz,
        last_synced_at timestamptz,
        print_identity_key text,
        ai_metadata jsonb,
        image_hash text,
        data_quality_flags jsonb,
        image_status text,
        image_res jsonb,
        image_last_checked_at timestamptz,
        printed_set_abbrev text,
        printed_total integer,
        image_path text,
        identity_domain text,
        printed_identity_modifier text
      )
    `,
    [payload],
  );
}

async function insertCanonicalRows(client) {
  const result = await client.query(
    `
      insert into public.card_prints (
        id,
        game_id,
        set_id,
        name,
        number,
        variant_key,
        rarity,
        image_url,
        tcgplayer_id,
        external_ids,
        updated_at,
        set_code,
        artist,
        regulation_mark,
        image_alt_url,
        image_source,
        variants,
        created_at,
        last_synced_at,
        print_identity_key,
        ai_metadata,
        image_hash,
        data_quality_flags,
        image_status,
        image_res,
        image_last_checked_at,
        printed_set_abbrev,
        printed_total,
        gv_id,
        image_path,
        identity_domain,
        printed_identity_modifier
      )
      select
        m.new_id,
        m.game_id,
        m.set_id,
        m.proposed_name,
        m.proposed_number,
        m.proposed_variant_key,
        m.rarity,
        m.image_url,
        m.tcgplayer_id,
        m.external_ids,
        now(),
        $1,
        m.artist,
        m.regulation_mark,
        m.image_alt_url,
        m.image_source,
        m.variants,
        m.created_at,
        m.last_synced_at,
        m.print_identity_key,
        m.ai_metadata,
        m.image_hash,
        m.data_quality_flags,
        m.image_status,
        m.image_res,
        m.image_last_checked_at,
        m.printed_set_abbrev,
        m.printed_total,
        m.new_gv_id,
        m.image_path,
        coalesce(m.identity_domain, $2),
        m.printed_identity_modifier
      from ${TMP_MAP} m
      order by m.seq
    `,
    [TARGET_SET_CODE, TARGET_IDENTITY_DOMAIN],
  );

  return normalizeCount(result.rowCount);
}

async function applyPromotion(client) {
  const insertedCanonicalRows = await insertCanonicalRows(client);

  const updatedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set
      card_print_id = m.new_id,
      updated_at = now()
    from ${TMP_MAP} m
    where cpi.card_print_id = m.old_id
  `);

  const activeIdentityConflicts = await queryRows(
    client,
    `
      select
        cpi.card_print_id,
        count(*) filter (where cpi.is_active = true)::int as active_identity_rows
      from public.card_print_identity cpi
      where cpi.card_print_id in (select new_id from ${TMP_MAP})
      group by cpi.card_print_id
      having count(*) filter (where cpi.is_active = true) <> 1
    `,
  );

  if (activeIdentityConflicts.length > 0) {
    throw new Error(`ACTIVE_IDENTITY_CONFLICT_AFTER_REPOINT:${JSON.stringify(activeIdentityConflicts)}`);
  }

  const updatedTraits = await client.query(`
    update public.card_print_traits t
    set card_print_id = m.new_id
    from ${TMP_MAP} m
    where t.card_print_id = m.old_id
  `);

  const updatedPrintings = await client.query(`
    update public.card_printings p
    set card_print_id = m.new_id
    from ${TMP_MAP} m
    where p.card_print_id = m.old_id
  `);

  const updatedExternalMappings = await client.query(`
    update public.external_mappings em
    set card_print_id = m.new_id
    from ${TMP_MAP} m
    where em.card_print_id = m.old_id
  `);

  const updatedVaultItems = await client.query(`
    update public.vault_items vi
    set
      card_id = m.new_id,
      gv_id = m.new_gv_id
    from ${TMP_MAP} m
    where vi.card_id = m.old_id
  `);

  return {
    inserted_canonical_rows: insertedCanonicalRows,
    card_print_identity: normalizeCount(updatedIdentityRows.rowCount),
    card_print_traits: normalizeCount(updatedTraits.rowCount),
    card_printings: normalizeCount(updatedPrintings.rowCount),
    external_mappings: normalizeCount(updatedExternalMappings.rowCount),
    vault_items: normalizeCount(updatedVaultItems.rowCount),
  };
}

async function loadFkOrphans(client) {
  const row = await queryOne(
    client,
    `
      select
        (select count(*)::int from public.card_print_identity where card_print_id not in (select id from public.card_prints)) as card_print_identity_orphans,
        (select count(*)::int from public.card_print_traits where card_print_id not in (select id from public.card_prints)) as card_print_traits_orphans,
        (select count(*)::int from public.card_printings where card_print_id not in (select id from public.card_prints)) as card_printings_orphans,
        (select count(*)::int from public.external_mappings where card_print_id not in (select id from public.card_prints)) as external_mappings_orphans,
        (select count(*)::int from public.vault_items where card_id not in (select id from public.card_prints)) as vault_items_orphans
    `,
  );

  return {
    card_print_identity_orphans: normalizeCount(row?.card_print_identity_orphans),
    card_print_traits_orphans: normalizeCount(row?.card_print_traits_orphans),
    card_printings_orphans: normalizeCount(row?.card_printings_orphans),
    external_mappings_orphans: normalizeCount(row?.external_mappings_orphans),
    vault_items_orphans: normalizeCount(row?.vault_items_orphans),
  };
}

async function loadRemainingOldReferenceCounts(client) {
  const row = await queryOne(
    client,
    `
      select
        (select count(*)::int from public.card_print_identity where card_print_id in (select old_id from ${TMP_MAP})) as card_print_identity,
        (select count(*)::int from public.card_print_traits where card_print_id in (select old_id from ${TMP_MAP})) as card_print_traits,
        (select count(*)::int from public.card_printings where card_print_id in (select old_id from ${TMP_MAP})) as card_printings,
        (select count(*)::int from public.external_mappings where card_print_id in (select old_id from ${TMP_MAP})) as external_mappings,
        (select count(*)::int from public.vault_items where card_id in (select old_id from ${TMP_MAP})) as vault_items
    `,
  );

  return {
    card_print_identity: normalizeCount(row?.card_print_identity),
    card_print_traits: normalizeCount(row?.card_print_traits),
    card_printings: normalizeCount(row?.card_printings),
    external_mappings: normalizeCount(row?.external_mappings),
    vault_items: normalizeCount(row?.vault_items),
  };
}

async function loadPromotedRowSamples(client, limit = 5) {
  return queryRows(
    client,
    `
      select
        m.old_id,
        m.old_name,
        m.old_printed_token,
        m.new_id,
        m.new_gv_id,
        m.proposed_number_plain,
        exists (
          select 1
          from public.card_prints old_cp
          where old_cp.id = m.old_id
        ) as old_parent_still_exists,
        cp.name as new_name,
        cp.number as new_number,
        cp.number_plain as new_number_plain,
        cp.variant_key as new_variant_key,
        cp.set_code as new_set_code,
        cp.gv_id as new_gv_id_after
      from ${TMP_MAP} m
      join public.card_prints cp
        on cp.id = m.new_id
      order by m.seq
      limit $1
    `,
    [limit],
  );
}

async function loadNewCanonicalRowSummary(client) {
  const row = await queryOne(
    client,
    `
      select
        count(*)::int as created_rows,
        count(distinct gv_id)::int as distinct_gv_ids,
        count(*) filter (where gv_id is not null)::int as non_null_gv_ids
      from public.card_prints
      where id in (select new_id from ${TMP_MAP})
    `,
  );

  return {
    created_rows: normalizeCount(row?.created_rows),
    distinct_gv_ids: normalizeCount(row?.distinct_gv_ids),
    non_null_gv_ids: normalizeCount(row?.non_null_gv_ids),
  };
}

async function loadBackupSchemaSnapshot(client) {
  return queryRows(
    client,
    `
      select
        table_name,
        ordinal_position,
        column_name,
        data_type,
        is_nullable,
        column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = any($1::text[])
      order by table_name, ordinal_position
    `,
    [['card_prints', 'card_print_identity', 'card_print_traits', 'card_printings', 'external_mappings', 'vault_items']],
  );
}

async function loadBackupTableRows(client, tableName, keyColumn, ids, extraColumns = []) {
  if (ids.length === 0) return [];
  const orderSql = [quoteIdent(keyColumn), ...extraColumns.map((column) => quoteIdent(column))].join(', ');
  return queryRows(
    client,
    `
      select to_jsonb(src) as row_json
      from (
        select *
        from public.${quoteIdent(tableName)}
        where ${quoteIdent(keyColumn)} = any($1::uuid[])
        order by ${orderSql}
      ) src
    `,
    [ids],
  );
}

function writeSqlCommentFile(filePath, lines) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

async function writeBackupFiles(client, candidateMap, fkInventory) {
  const oldIds = candidateMap.map((row) => row.old_id);
  const schemaRows = await loadBackupSchemaSnapshot(client);
  const cardPrintRows = await loadBackupTableRows(client, 'card_prints', 'id', oldIds);
  const identityRows = await loadBackupTableRows(client, 'card_print_identity', 'card_print_id', oldIds, ['id']);
  const traitRows = await loadBackupTableRows(client, 'card_print_traits', 'card_print_id', oldIds, ['id']);
  const printingRows = await loadBackupTableRows(client, 'card_printings', 'card_print_id', oldIds, ['id']);
  const externalRows = await loadBackupTableRows(client, 'external_mappings', 'card_print_id', oldIds, ['id']);
  const vaultRows = await loadBackupTableRows(client, 'vault_items', 'card_id', oldIds, ['id']);

  writeSqlCommentFile(BACKUP_SCHEMA_PATH, [
    `-- ${PHASE} schema snapshot`,
    `-- generated_at: ${new Date().toISOString()}`,
    '--',
    '-- supported_fk_inventory:',
    ...fkInventory.map((row) => `--   ${row.table_name}.${row.column_name} rows=${row.row_count} supported=${row.supported_handler}`),
    '--',
    '-- columns:',
    ...schemaRows.map(
      (row) =>
        `--   ${row.table_name}.${row.column_name} ${row.data_type} nullable=${row.is_nullable} default=${row.column_default ?? 'null'}`,
    ),
  ]);

  writeSqlCommentFile(BACKUP_DATA_PATH, [
    `-- ${PHASE} data snapshot`,
    `-- generated_at: ${new Date().toISOString()}`,
    '-- source_old_ids:',
    ...oldIds.map((id) => `--   ${id}`),
    '--',
    '-- card_prints:',
    ...cardPrintRows.map((row) => `--   ${JSON.stringify(row.row_json)}`),
    '-- card_print_identity:',
    ...identityRows.map((row) => `--   ${JSON.stringify(row.row_json)}`),
    '-- card_print_traits:',
    ...traitRows.map((row) => `--   ${JSON.stringify(row.row_json)}`),
    '-- card_printings:',
    ...printingRows.map((row) => `--   ${JSON.stringify(row.row_json)}`),
    '-- external_mappings:',
    ...externalRows.map((row) => `--   ${JSON.stringify(row.row_json)}`),
    '-- vault_items:',
    ...vaultRows.map((row) => `--   ${JSON.stringify(row.row_json)}`),
  ]);
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const report = {
    phase: PHASE,
    mode: MODE,
    generated_at: new Date().toISOString(),
    set_code: TARGET_SET_CODE,
    set_metadata: null,
    preconditions: null,
    fk_inventory: null,
    backup_paths: null,
    fk_movement_summary: {
      inserted_canonical_rows: 0,
      card_print_identity: 0,
      card_print_traits: 0,
      card_printings: 0,
      external_mappings: 0,
      vault_items: 0,
    },
    sample_promoted_rows: [],
    post_validation: null,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    application_name: `${PHASE}:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');

    const setMetadata = await loadSetMetadata(client);
    const unresolvedCountBefore = await loadUnresolvedCount(client, setMetadata.id);
    const canonicalCountBefore = await loadCanonicalCount(client, setMetadata.id);
    const sourceRows = await loadSourceRows(client, setMetadata.id);
    const sourceScopeDiffs = buildSourceScopeDiffs(sourceRows);
    const candidateMap = buildCandidateMap(sourceRows, setMetadata);
    const duplicatePrintedTokens = buildDuplicatePrintedTokens(sourceRows);
    const duplicateProposedKeys = buildDuplicateProposedKeys(candidateMap);
    const duplicateNewIds = buildDuplicateNewIds(candidateMap);
    const liveExactTokenCollisions = await loadLiveExactTokenCollisions(client, candidateMap);
    const liveIdentityKeyCollisions = await loadLiveIdentityKeyCollisions(client, candidateMap);
    const liveNewIdCollisions = await loadLiveNewIdCollisions(client, candidateMap);
    const liveGvIdCollisions = await loadLiveGvIdCollisions(client, candidateMap);

    report.set_metadata = setMetadata;
    report.preconditions = buildPreconditions({
      unresolvedCountBefore,
      canonicalCountBefore,
      sourceRows,
      sourceScopeDiffs,
      duplicatePrintedTokens,
      duplicateProposedKeys,
      duplicateNewIds,
      liveExactTokenCollisions,
      liveIdentityKeyCollisions,
      liveNewIdCollisions,
      liveGvIdCollisions,
    });
    report.preconditions.source_scope_diffs = sourceScopeDiffs;
    report.preconditions.expected_tokens = EXPECTED_ROWS.map((row) => row.old_printed_token);
    report.preconditions.expected_gv_ids = EXPECTED_ROWS.map((row) => row.new_gv_id);

    await createTempPromotionMap(client, candidateMap);

    const fkInventory = await loadFkCounts(client, await loadCardPrintFkInventory(client), `select old_id from ${TMP_MAP}`);
    assertNoUnexpectedReferencedTables(fkInventory);

    report.fk_inventory = await loadSupportedFkCounts(client, candidateMap.map((row) => row.old_id));
    report.sample_promoted_rows = candidateMap.slice(0, 5).map((row) => ({
      old_id: row.old_id,
      old_name: row.old_name,
      old_token: row.old_printed_token,
      new_id: row.new_id,
      proposed_number_plain: row.proposed_number_plain,
      proposed_variant_key: row.proposed_variant_key,
      proposed_gv_id: row.new_gv_id,
    }));

    if (MODE !== 'apply') {
      assertPreconditions(report.preconditions);
      report.status = 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    assertPreconditions(report.preconditions);

    await writeBackupFiles(client, candidateMap, fkInventory);
    report.backup_paths = {
      schema: BACKUP_SCHEMA_PATH,
      data: BACKUP_DATA_PATH,
    };

    report.fk_movement_summary = await applyPromotion(client);

    const remainingOldReferences = await loadRemainingOldReferenceCounts(client);
    for (const [tableRef, rowCount] of Object.entries(remainingOldReferences)) {
      if (rowCount !== 0) {
        throw new Error(`REMAINING_OLD_REFERENCES_AFTER_REPOINT:${tableRef}:${rowCount}`);
      }
    }

    const deletedParents = await client.query(`
      delete from public.card_prints cp
      using ${TMP_MAP} m
      where cp.id = m.old_id
    `);

    if (normalizeCount(deletedParents.rowCount) !== EXPECTED.source_count) {
      throw new Error(`DELETED_OLD_PARENT_COUNT_DRIFT:${deletedParents.rowCount}:${EXPECTED.source_count}`);
    }

    const canonicalCountAfter = await loadCanonicalCount(client, setMetadata.id);
    const unresolvedCountAfter = await loadUnresolvedCount(client, setMetadata.id);
    const fkOrphans = await loadFkOrphans(client);
    const newCanonicalRows = await loadNewCanonicalRowSummary(client);
    const sampleAfterRows = await loadPromotedRowSamples(client);

    for (const row of sampleAfterRows) {
      if (row.old_parent_still_exists !== false) {
        throw new Error(`OLD_PARENT_STILL_EXISTS:${row.old_id}`);
      }
      if (row.new_gv_id_after !== row.new_gv_id) {
        throw new Error(`TARGET_GVID_DRIFT:${row.new_id}:${row.new_gv_id_after}:${row.new_gv_id}`);
      }
      if (row.new_number !== row.old_printed_token) {
        throw new Error(`TARGET_NUMBER_DRIFT:${row.new_id}:${row.new_number}:${row.old_printed_token}`);
      }
      if (String(row.new_number_plain) !== String(row.proposed_number_plain)) {
        throw new Error(`TARGET_NUMBER_PLAIN_DRIFT:${row.new_id}:${row.new_number_plain}:${row.proposed_number_plain}`);
      }
      if ((normalizeTextOrNull(row.new_variant_key) ?? '') !== 'rc') {
        throw new Error(`TARGET_VARIANT_KEY_DRIFT:${row.new_id}:${row.new_variant_key}`);
      }
    }

    if (Object.values(fkOrphans).some((count) => count !== 0)) {
      throw new Error(`FK_ORPHANS_DETECTED:${JSON.stringify(fkOrphans)}`);
    }
    if (unresolvedCountAfter !== 0) {
      throw new Error(`REMAINING_UNRESOLVED_ROWS:${unresolvedCountAfter}`);
    }
    if (canonicalCountAfter - canonicalCountBefore !== EXPECTED.canonical_count_delta) {
      throw new Error(`CANONICAL_COUNT_DELTA_DRIFT:${canonicalCountAfter - canonicalCountBefore}:${EXPECTED.canonical_count_delta}`);
    }
    if (
      newCanonicalRows.created_rows !== EXPECTED.source_count ||
      newCanonicalRows.non_null_gv_ids !== EXPECTED.source_count ||
      newCanonicalRows.distinct_gv_ids !== EXPECTED.source_count
    ) {
      throw new Error(`NEW_CANONICAL_ROW_SUMMARY_DRIFT:${JSON.stringify(newCanonicalRows)}`);
    }

    report.sample_promoted_rows = sampleAfterRows.map((row) => ({
      old_id: row.old_id,
      old_name: row.old_name,
      old_token: row.old_printed_token,
      new_id: row.new_id,
      new_name: row.new_name,
      new_number: row.new_number,
      new_number_plain: row.new_number_plain,
      new_variant_key: row.new_variant_key,
      new_gv_id: row.new_gv_id,
    }));
    report.post_validation = {
      promotion_count: EXPECTED.source_count,
      remaining_unresolved_rows: unresolvedCountAfter,
      canonical_count_delta: canonicalCountAfter - canonicalCountBefore,
      fk_orphan_counts: fkOrphans,
      new_canonical_rows: newCanonicalRows,
    };

    report.status = 'apply_passed';
    await client.query('commit');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve the original failure.
    }

    report.status = report.status === 'running' ? 'failed' : report.status;
    report.failure = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    };
    console.error(JSON.stringify(report, null, 2));
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
