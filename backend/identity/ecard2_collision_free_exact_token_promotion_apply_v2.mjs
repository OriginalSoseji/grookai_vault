/**
 * MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * This script mutates canonical identity outside runtime executor.
 * It is NOT part of the runtime authority system.
 *
 * RULES:
 * - must never be executed implicitly
 * - must never be called by workers
 * - must never be used in normal flows
 * - must require explicit operator intent
 */
import '../env.mjs';
import crypto from 'crypto';
import { Client } from 'pg';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';

import { installIdentityMaintenanceBoundaryV1 } from './identity_maintenance_boundary_v1.mjs';

if (!process.env.ENABLE_IDENTITY_MAINTENANCE_MODE) {
  throw new Error(
    'RUNTIME_ENFORCEMENT: identity maintenance scripts are disabled. Set ENABLE_IDENTITY_MAINTENANCE_MODE=true for explicit use.',
  );
}

if (process.env.IDENTITY_MAINTENANCE_MODE !== 'EXPLICIT') {
  throw new Error(
    "RUNTIME_ENFORCEMENT: IDENTITY_MAINTENANCE_MODE must be 'EXPLICIT'",
  );
}

if (process.env.IDENTITY_MAINTENANCE_ENTRYPOINT !== 'backend/identity/run_identity_maintenance_v1.mjs') {
  throw new Error(
    'RUNTIME_ENFORCEMENT: identity maintenance scripts must be launched from backend/identity/run_identity_maintenance_v1.mjs',
  );
}

const DRY_RUN = process.env.IDENTITY_MAINTENANCE_DRY_RUN !== 'false';
const { assertMaintenanceWriteAllowed } = installIdentityMaintenanceBoundaryV1(import.meta.url);

if (DRY_RUN) {
  console.log('IDENTITY MAINTENANCE: running in DRY RUN mode');
}

void assertMaintenanceWriteAllowed;
const PHASE = 'ECARD2_COLLISION_FREE_EXACT_TOKEN_PROMOTION_V2';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const TARGET_SET_CODE = 'ecard2';
const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';

const EXPECTED = {
  unresolved_parent_count: 34,
  promotion_ready_collision_free_count: 11,
  promotion_namespace_collision_count: 13,
  blocked_conflict_count: 10,
  unclassified_count: 0,
};

const TMP_MAP = 'tmp_ecard2_promotion_map_v2';
const SUPPORTED_REFERENCE_TABLES = new Set([
  'card_print_identity.card_print_id',
  'card_print_traits.card_print_id',
  'card_printings.card_print_id',
  'external_mappings.card_print_id',
  'vault_items.card_id',
]);

const CLASSIFICATION_SQL = `
with unresolved as (
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
    cp.updated_at,
    cp.set_code as old_set_code,
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
    cpi.printed_number as old_printed_token,
    lower(regexp_replace(btrim(coalesce(cpi.normalized_printed_name, cp.name)), '\\s+', ' ', 'g')) as exact_name_key,
    btrim(
      regexp_replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(lower(coalesce(cp.name, cpi.normalized_printed_name)), chr(8217), ''''),
                    chr(96),
                    ''''
                  ),
                  chr(180),
                  ''''
                ),
                chr(8212),
                ' '
              ),
              chr(8211),
              ' '
            ),
            '-gx',
            ' gx'
          ),
          '-ex',
          ' ex'
        ),
        '\\s+',
        ' ',
        'g'
      )
    ) as normalized_name,
    nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as proposed_number_plain
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  join public.sets s
    on s.id = cp.set_id
  where cpi.identity_domain = $1
    and cpi.set_code_identity = $2
    and cpi.is_active = true
    and cp.gv_id is null
),
canonical_in_set as (
  select
    cp.id as candidate_target_id,
    cp.name as candidate_target_name,
    cp.number as candidate_target_number,
    cp.number_plain as candidate_target_number_plain,
    lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as exact_name_key,
    btrim(
      regexp_replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(lower(cp.name), chr(8217), ''''),
                    chr(96),
                    ''''
                  ),
                  chr(180),
                  ''''
                ),
                chr(8212),
                ' '
              ),
              chr(8211),
              ' '
            ),
            '-gx',
            ' gx'
          ),
          '-ex',
          ' ex'
        ),
        '\\s+',
        ' ',
        'g'
      )
    ) as normalized_name
  from public.card_prints cp
  where cp.set_code = $3
    and cp.gv_id is not null
),
row_metrics as (
  select
    u.old_parent_id,
    count(distinct c.candidate_target_id) filter (
      where c.candidate_target_number = u.old_printed_token
        and c.exact_name_key = u.exact_name_key
    )::int as exact_match_count,
    count(distinct c.candidate_target_id) filter (
      where c.candidate_target_number_plain = u.proposed_number_plain
        and c.normalized_name = u.normalized_name
    )::int as base_match_count,
    count(distinct c.candidate_target_id) filter (
      where c.candidate_target_number_plain = u.proposed_number_plain
        and c.normalized_name <> u.normalized_name
    )::int as same_base_different_name_count
  from unresolved u
  left join canonical_in_set c
    on c.candidate_target_number = u.old_printed_token
    or c.candidate_target_number_plain = u.proposed_number_plain
  group by u.old_parent_id
),
base_classification as (
  select
    u.*,
    case
      when rm.exact_match_count > 0 then 'UNCLASSIFIED'
      when rm.base_match_count > 0 then 'UNCLASSIFIED'
      when rm.same_base_different_name_count > 0 then 'BLOCKED_CONFLICT'
      else 'PROMOTION_REQUIRED'
    end as base_execution_class,
    case
      when rm.exact_match_count > 0 then 'unexpected same-set exact-token target exists'
      when rm.base_match_count > 0 then 'unexpected same-set normalized target exists'
      when rm.same_base_different_name_count > 0 then
        'numeric base ' || coalesce(u.proposed_number_plain, '<null>') || ' is already owned by a different in-set canonical identity'
      else
        'no lawful same-set canonical target exists after NAME_NORMALIZE_V3 + TOKEN_NORMALIZE_V1'
    end as base_proof_reason
  from unresolved u
  join row_metrics rm
    on rm.old_parent_id = u.old_parent_id
),
promotion_scope as (
  select
    b.*,
    'GV-PK-' || upper(regexp_replace(b.set_printed_set_abbrev, '[^A-Za-z0-9]+', '', 'g')) || '-' ||
      upper(regexp_replace(b.old_printed_token, '[^A-Za-z0-9]+', '', 'g')) as proposed_gv_id_sql
  from base_classification b
  where b.base_execution_class = 'PROMOTION_REQUIRED'
),
identity_key_collisions as (
  select
    p.old_parent_id,
    cp.id as collision_target_id,
    cp.gv_id as collision_target_gv_id,
    cp.name as collision_target_name,
    cp.set_code as collision_target_set_code
  from promotion_scope p
  join public.card_prints cp
    on cp.set_id = p.set_id
   and cp.number_plain = p.proposed_number_plain
   and coalesce(cp.variant_key, '') = coalesce(p.variant_key, '')
   and cp.id <> p.old_parent_id
),
gvid_collisions as (
  select
    p.old_parent_id,
    cp.id as collision_target_id,
    cp.gv_id as collision_target_gv_id,
    cp.name as collision_target_name,
    cp.set_code as collision_target_set_code
  from promotion_scope p
  join public.card_prints cp
    on cp.gv_id = p.proposed_gv_id_sql
   and cp.id <> p.old_parent_id
),
promotion_collision_audit as (
  select
    p.old_parent_id,
    p.old_name,
    p.old_printed_token,
    p.proposed_number_plain,
    p.variant_key as proposed_variant_key,
    p.proposed_gv_id_sql,
    case when ic.collision_target_id is null then 'no' else 'yes' end as identity_key_collision,
    case when gc.collision_target_id is null then 'no' else 'yes' end as gvid_collision,
    coalesce(gc.collision_target_id, ic.collision_target_id) as collision_target_id,
    coalesce(gc.collision_target_gv_id, ic.collision_target_gv_id) as collision_target_gv_id,
    coalesce(gc.collision_target_name, ic.collision_target_name) as collision_target_name,
    coalesce(gc.collision_target_set_code, ic.collision_target_set_code) as collision_target_set_code
  from promotion_scope p
  left join identity_key_collisions ic
    on ic.old_parent_id = p.old_parent_id
  left join gvid_collisions gc
    on gc.old_parent_id = p.old_parent_id
),
final_classification as (
  select
    b.old_parent_id,
    b.game_id,
    b.set_id,
    b.set_code,
    b.set_printed_set_abbrev,
    b.old_name,
    b.variant_key,
    b.rarity,
    b.image_url,
    b.tcgplayer_id,
    b.external_ids,
    b.updated_at,
    b.old_set_code,
    b.artist,
    b.regulation_mark,
    b.image_alt_url,
    b.image_source,
    b.variants,
    b.created_at,
    b.last_synced_at,
    b.print_identity_key,
    b.ai_metadata,
    b.image_hash,
    b.data_quality_flags,
    b.image_status,
    b.image_res,
    b.image_last_checked_at,
    b.printed_set_abbrev,
    b.printed_total,
    b.image_path,
    b.identity_domain,
    b.printed_identity_modifier,
    b.old_printed_token,
    b.proposed_number_plain,
    null::text as proposed_gv_id_sql,
    'BLOCKED_CONFLICT'::text as execution_class,
    b.base_proof_reason as proof_reason,
    null::text as identity_key_collision,
    null::text as gvid_collision,
    null::uuid as collision_target_id,
    null::text as collision_target_gv_id,
    null::text as collision_target_name,
    null::text as collision_target_set_code
  from base_classification b
  where b.base_execution_class = 'BLOCKED_CONFLICT'

  union all

  select
    b.old_parent_id,
    b.game_id,
    b.set_id,
    b.set_code,
    b.set_printed_set_abbrev,
    b.old_name,
    b.variant_key,
    b.rarity,
    b.image_url,
    b.tcgplayer_id,
    b.external_ids,
    b.updated_at,
    b.old_set_code,
    b.artist,
    b.regulation_mark,
    b.image_alt_url,
    b.image_source,
    b.variants,
    b.created_at,
    b.last_synced_at,
    b.print_identity_key,
    b.ai_metadata,
    b.image_hash,
    b.data_quality_flags,
    b.image_status,
    b.image_res,
    b.image_last_checked_at,
    b.printed_set_abbrev,
    b.printed_total,
    b.image_path,
    b.identity_domain,
    b.printed_identity_modifier,
    pca.old_printed_token,
    pca.proposed_number_plain,
    pca.proposed_gv_id_sql,
    case
      when pca.identity_key_collision = 'no' and pca.gvid_collision = 'no' then 'PROMOTION_READY_COLLISION_FREE'
      when pca.identity_key_collision = 'yes' or pca.gvid_collision = 'yes' then 'PROMOTION_NAMESPACE_COLLISION'
      else 'UNCLASSIFIED'
    end as execution_class,
    case
      when pca.identity_key_collision = 'no' and pca.gvid_collision = 'no' then
        'exact-token promotion is collision-free under both canonical identity key and GV namespace'
      when pca.identity_key_collision = 'yes' and pca.gvid_collision = 'yes' then
        'promotion identity is lawful, but both canonical identity key and proposed GV-ID are already occupied in live namespace'
      when pca.identity_key_collision = 'no' and pca.gvid_collision = 'yes' then
        'promotion identity is lawful, but proposed GV-ID is already occupied in live namespace'
      when pca.identity_key_collision = 'yes' and pca.gvid_collision = 'no' then
        'promotion identity is lawful, but canonical identity key is already occupied in live namespace'
      else
        'classification gap'
    end as proof_reason,
    pca.identity_key_collision,
    pca.gvid_collision,
    pca.collision_target_id,
    pca.collision_target_gv_id,
    pca.collision_target_name,
    pca.collision_target_set_code
  from promotion_collision_audit pca
  join base_classification b
    on b.old_parent_id = pca.old_parent_id
)
select *
from final_classification
order by old_printed_token, old_name, old_parent_id
`;

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

function isHoloToken(value) {
  return /^H[0-9]+$/i.test(String(value ?? '').trim());
}

function comparePrintedTokens(left, right) {
  const a = normalizeTextOrNull(left)?.toUpperCase() ?? '';
  const b = normalizeTextOrNull(right)?.toUpperCase() ?? '';
  const aHolo = isHoloToken(a);
  const bHolo = isHoloToken(b);
  if (aHolo !== bHolo) return aHolo ? 1 : -1;
  const aDigits = a.replace(/^[A-Z]+/, '');
  const bDigits = b.replace(/^[A-Z]+/, '');
  const aNumber = aDigits ? Number.parseInt(aDigits, 10) : Number.MAX_SAFE_INTEGER;
  const bNumber = bDigits ? Number.parseInt(bDigits, 10) : Number.MAX_SAFE_INTEGER;
  if (aNumber !== bNumber) return aNumber - bNumber;
  return a.localeCompare(b);
}

function sortByToken(left, right) {
  const tokenOrder = comparePrintedTokens(left.old_printed_token, right.old_printed_token);
  if (tokenOrder !== 0) return tokenOrder;
  return String(left.old_parent_id).localeCompare(String(right.old_parent_id));
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

async function loadClassifiedRows(client) {
  return queryRows(client, CLASSIFICATION_SQL, [
    TARGET_IDENTITY_DOMAIN,
    TARGET_SET_CODE,
    TARGET_SET_CODE,
  ]);
}

function buildCandidateMap(rows, setMetadata) {
  return rows
    .map((row) => {
      const newGvId = buildCardPrintGvIdV1({
        setCode: TARGET_SET_CODE,
        printedSetAbbrev: setMetadata.printed_set_abbrev,
        number: row.old_printed_token,
        variantKey: row.variant_key,
      });

      if (newGvId !== row.proposed_gv_id_sql) {
        throw new Error(`GV_ID_SQL_JS_MISMATCH:${row.old_parent_id}:${row.proposed_gv_id_sql}:${newGvId}`);
      }

      return {
        old_id: row.old_parent_id,
        old_name: row.old_name,
        old_printed_token: row.old_printed_token,
        new_id: deterministicUuidFromSeed(`${PHASE}:${row.old_parent_id}`),
        new_gv_id: newGvId,
        set_id: row.set_id,
        game_id: row.game_id,
        proposed_name: row.old_name,
        proposed_number: row.old_printed_token,
        proposed_number_plain: row.proposed_number_plain,
        proposed_variant_key: normalizeTextOrNull(row.variant_key) ?? '',
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
        printed_set_abbrev: row.printed_set_abbrev,
        printed_total: row.printed_total,
        image_path: row.image_path,
        identity_domain: row.identity_domain,
        printed_identity_modifier: row.printed_identity_modifier,
      };
    })
    .sort(sortByToken);
}

function buildDuplicateProposedKeys(candidateMap) {
  const counts = new Map();
  for (const row of candidateMap) {
    const key = JSON.stringify({
      set_id: row.set_id,
      number_plain: row.proposed_number_plain,
      variant_key: row.proposed_variant_key,
      printed_identity_modifier: '',
    });
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([key, row_count]) => ({ key, row_count }));
}

function buildDuplicateNewIds(candidateMap) {
  const counts = new Map();
  for (const row of candidateMap) {
    counts.set(row.new_id, (counts.get(row.new_id) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([new_id, row_count]) => ({ new_id, row_count }));
}

function buildExcludedOverlapRows(candidateMap, excludedRows) {
  const excludedIds = new Set(excludedRows.map((row) => row.old_parent_id));
  return candidateMap.filter((row) => excludedIds.has(row.old_id));
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
       and cp.number_plain = payload.proposed_number_plain
       and coalesce(cp.variant_key, '') = coalesce(payload.proposed_variant_key, '')
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
  classifiedRows,
  readyRows,
  namespaceRows,
  blockedRows,
  unclassifiedRows,
  duplicateProposedKeys,
  duplicateNewIds,
  excludedOverlapRows,
  liveNewIdCollisions,
  liveGvIdCollisions,
  liveIdentityKeyCollisions,
}) {
  const stopReasons = [];

  if (classifiedRows.length !== EXPECTED.unresolved_parent_count) {
    stopReasons.push(`UNRESOLVED_PARENT_COUNT:${classifiedRows.length}`);
  }
  if (readyRows.length !== EXPECTED.promotion_ready_collision_free_count) {
    stopReasons.push(`PROMOTION_READY_COUNT:${readyRows.length}`);
  }
  if (namespaceRows.length !== EXPECTED.promotion_namespace_collision_count) {
    stopReasons.push(`PROMOTION_NAMESPACE_COLLISION_COUNT:${namespaceRows.length}`);
  }
  if (blockedRows.length !== EXPECTED.blocked_conflict_count) {
    stopReasons.push(`BLOCKED_CONFLICT_COUNT:${blockedRows.length}`);
  }
  if (unclassifiedRows.length !== EXPECTED.unclassified_count) {
    stopReasons.push(`UNCLASSIFIED_COUNT:${unclassifiedRows.length}`);
  }
  if (duplicateProposedKeys.length > 0) {
    stopReasons.push(`DUPLICATE_PROPOSED_KEYS:${duplicateProposedKeys.length}`);
  }
  if (duplicateNewIds.length > 0) {
    stopReasons.push(`DUPLICATE_NEW_IDS:${duplicateNewIds.length}`);
  }
  if (excludedOverlapRows.length > 0) {
    stopReasons.push(`EXCLUDED_ROW_OVERLAP:${excludedOverlapRows.length}`);
  }
  if (liveNewIdCollisions.length > 0) {
    stopReasons.push(`LIVE_NEW_ID_COLLISIONS:${liveNewIdCollisions.length}`);
  }
  if (liveGvIdCollisions.length > 0) {
    stopReasons.push(`LIVE_GVID_COLLISIONS:${liveGvIdCollisions.length}`);
  }
  if (liveIdentityKeyCollisions.length > 0) {
    stopReasons.push(`LIVE_IDENTITY_KEY_COLLISIONS:${liveIdentityKeyCollisions.length}`);
  }

  return {
    unresolved_parent_count: classifiedRows.length,
    promotion_ready_collision_free_count: readyRows.length,
    promotion_namespace_collision_count: namespaceRows.length,
    blocked_conflict_count: blockedRows.length,
    unclassified_count: unclassifiedRows.length,
    duplicate_proposed_key_count: duplicateProposedKeys.length,
    duplicate_new_id_count: duplicateNewIds.length,
    excluded_overlap_count: excludedOverlapRows.length,
    live_new_id_collision_count: liveNewIdCollisions.length,
    live_gvid_collision_count: liveGvIdCollisions.length,
    live_identity_key_collision_count: liveIdentityKeyCollisions.length,
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

    create unique index tmp_ecard2_promotion_map_v2_old_uidx on ${TMP_MAP} (old_id);
    create unique index tmp_ecard2_promotion_map_v2_new_uidx on ${TMP_MAP} (new_id);
    create unique index tmp_ecard2_promotion_map_v2_gvid_uidx on ${TMP_MAP} (new_gv_id);
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

async function loadCanonicalCount(client) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as row_count
      from public.card_prints
      where set_code = $1
        and gv_id is not null
    `,
    [TARGET_SET_CODE],
  );

  return normalizeCount(row?.row_count);
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

async function loadExcludedRowState(client, excludedIds) {
  if (excludedIds.length === 0) {
    return {
      surviving_rows: 0,
      surviving_null_gvid_rows: 0,
    };
  }

  const row = await queryOne(
    client,
    `
      select
        count(*)::int as surviving_rows,
        count(*) filter (where gv_id is null)::int as surviving_null_gvid_rows
      from public.card_prints
      where id = any($1::uuid[])
    `,
    [excludedIds],
  );

  return {
    surviving_rows: normalizeCount(row?.surviving_rows),
    surviving_null_gvid_rows: normalizeCount(row?.surviving_null_gvid_rows),
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
        exists (
          select 1
          from public.card_prints old_cp
          where old_cp.id = m.old_id
        ) as old_parent_still_exists,
        cp.name as new_name,
        cp.number as new_number,
        cp.number_plain as new_number_plain,
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
    const classifiedRows = await loadClassifiedRows(client);
    const readyRows = classifiedRows.filter((row) => row.execution_class === 'PROMOTION_READY_COLLISION_FREE');
    const namespaceRows = classifiedRows.filter((row) => row.execution_class === 'PROMOTION_NAMESPACE_COLLISION');
    const blockedRows = classifiedRows.filter((row) => row.execution_class === 'BLOCKED_CONFLICT');
    const unclassifiedRows = classifiedRows.filter((row) => row.execution_class === 'UNCLASSIFIED');
    const excludedRows = classifiedRows.filter((row) => row.execution_class !== 'PROMOTION_READY_COLLISION_FREE');
    const candidateMap = buildCandidateMap(readyRows, setMetadata);
    const duplicateProposedKeys = buildDuplicateProposedKeys(candidateMap);
    const duplicateNewIds = buildDuplicateNewIds(candidateMap);
    const excludedOverlapRows = buildExcludedOverlapRows(candidateMap, excludedRows);
    const liveNewIdCollisions = await loadLiveNewIdCollisions(client, candidateMap);
    const liveGvIdCollisions = await loadLiveGvIdCollisions(client, candidateMap);
    const liveIdentityKeyCollisions = await loadLiveIdentityKeyCollisions(client, candidateMap);

    report.set_metadata = setMetadata;
    report.preconditions = buildPreconditions({
      classifiedRows,
      readyRows,
      namespaceRows,
      blockedRows,
      unclassifiedRows,
      duplicateProposedKeys,
      duplicateNewIds,
      excludedOverlapRows,
      liveNewIdCollisions,
      liveGvIdCollisions,
      liveIdentityKeyCollisions,
    });
    report.preconditions.excluded_scope_count = excludedRows.length;
    report.preconditions.namespace_collision_rows = namespaceRows.map((row) => ({
      old_parent_id: row.old_parent_id,
      old_name: row.old_name,
      old_printed_token: row.old_printed_token,
      proposed_gv_id: row.proposed_gv_id_sql,
      collision_target_id: row.collision_target_id,
      collision_target_gv_id: row.collision_target_gv_id,
      collision_target_name: row.collision_target_name,
      collision_target_set_code: row.collision_target_set_code,
    }));

    await createTempPromotionMap(client, candidateMap);

    const fkInventory = await loadCardPrintFkInventory(client);
    const fkCounts = await loadFkCounts(
      client,
      fkInventory,
      `select old_id from ${TMP_MAP}`,
    );
    assertNoUnexpectedReferencedTables(fkCounts);

    report.fk_inventory = await loadSupportedFkCounts(client, candidateMap.map((row) => row.old_id));
    report.sample_promoted_rows = candidateMap.slice(0, 5).map((row) => ({
      old_id: row.old_id,
      old_name: row.old_name,
      old_token: row.old_printed_token,
      new_id: row.new_id,
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

    const canonicalCountBefore = await loadCanonicalCount(client);
    const excludedIds = excludedRows.map((row) => row.old_parent_id);
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

    if (normalizeCount(deletedParents.rowCount) !== EXPECTED.promotion_ready_collision_free_count) {
      throw new Error(`DELETED_OLD_PARENT_COUNT_DRIFT:${deletedParents.rowCount}:${EXPECTED.promotion_ready_collision_free_count}`);
    }

    const canonicalCountAfter = await loadCanonicalCount(client);
    const fkOrphans = await loadFkOrphans(client);
    const refreshedRows = await loadClassifiedRows(client);
    const remainingNamespaceRows = refreshedRows.filter((row) => row.execution_class === 'PROMOTION_NAMESPACE_COLLISION');
    const remainingBlockedRows = refreshedRows.filter((row) => row.execution_class === 'BLOCKED_CONFLICT');
    const remainingReadyRows = refreshedRows.filter((row) => row.execution_class === 'PROMOTION_READY_COLLISION_FREE');
    const remainingUnclassifiedRows = refreshedRows.filter((row) => row.execution_class === 'UNCLASSIFIED');
    const excludedRowState = await loadExcludedRowState(client, excludedIds);
    const sampleAfterRows = await loadPromotedRowSamples(client);

    for (const row of sampleAfterRows) {
      if (row.old_parent_still_exists !== false) {
        throw new Error(`OLD_PARENT_STILL_EXISTS:${row.old_id}`);
      }
      if (row.new_gv_id_after !== row.new_gv_id) {
        throw new Error(`TARGET_GVID_DRIFT:${row.new_id}:${row.new_gv_id_after}:${row.new_gv_id}`);
      }
    }

    if (Object.values(fkOrphans).some((count) => count !== 0)) {
      throw new Error(`FK_ORPHANS_DETECTED:${JSON.stringify(fkOrphans)}`);
    }
    if (remainingReadyRows.length !== 0) {
      throw new Error(`REMAINING_READY_ROWS:${remainingReadyRows.length}`);
    }
    if (remainingNamespaceRows.length !== EXPECTED.promotion_namespace_collision_count) {
      throw new Error(`REMAINING_NAMESPACE_COLLISION_ROWS:${remainingNamespaceRows.length}:${EXPECTED.promotion_namespace_collision_count}`);
    }
    if (remainingBlockedRows.length !== EXPECTED.blocked_conflict_count) {
      throw new Error(`REMAINING_BLOCKED_ROWS:${remainingBlockedRows.length}:${EXPECTED.blocked_conflict_count}`);
    }
    if (remainingUnclassifiedRows.length !== 0) {
      throw new Error(`REMAINING_UNCLASSIFIED_ROWS:${remainingUnclassifiedRows.length}`);
    }
    if (canonicalCountAfter - canonicalCountBefore !== EXPECTED.promotion_ready_collision_free_count) {
      throw new Error(`CANONICAL_COUNT_DELTA_DRIFT:${canonicalCountAfter - canonicalCountBefore}:${EXPECTED.promotion_ready_collision_free_count}`);
    }
    if (excludedRowState.surviving_rows !== excludedIds.length || excludedRowState.surviving_null_gvid_rows !== excludedIds.length) {
      throw new Error(`EXCLUDED_ROWS_MUTATED:${JSON.stringify(excludedRowState)}`);
    }

    report.sample_promoted_rows = sampleAfterRows.map((row) => ({
      old_id: row.old_id,
      old_name: row.old_name,
      old_token: row.old_printed_token,
      new_id: row.new_id,
      new_name: row.new_name,
      new_number: row.new_number,
      new_number_plain: row.new_number_plain,
      new_gv_id: row.new_gv_id,
    }));
    report.post_validation = {
      promotion_count: EXPECTED.promotion_ready_collision_free_count,
      remaining_promotion_required_rows: remainingNamespaceRows.length,
      remaining_namespace_collision_rows: remainingNamespaceRows.length,
      remaining_blocked_conflict_rows: remainingBlockedRows.length,
      canonical_count_delta: canonicalCountAfter - canonicalCountBefore,
      fk_orphan_counts: fkOrphans,
      excluded_rows_preserved_count: excludedRowState.surviving_null_gvid_rows,
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
