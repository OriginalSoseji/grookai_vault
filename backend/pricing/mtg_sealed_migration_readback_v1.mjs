export const MTG_SEALED_MIGRATION_VERSION_V1 = '20260903130000';
export const MTG_SEALED_MIGRATION_SHA256_V1 =
  '630463aa7af959d9e885423baa5fda948a759c0263a92805c8318828743ca0a6';
export const MTG_SEALED_VISIBILITY_MIGRATION_VERSION_V1 = '20260903143000';
export const MTG_SEALED_VISIBILITY_MIGRATION_SHA256_V1 =
  '0d58da0694dda6fa048ada1109fb9b11e1246eb14a818e50092c59822541dfde';

const EXPECTED_CONSTRAINTS = Object.freeze({
  sealed_product_releases_game_key_check: {
    table: 'sealed_product_releases', type: 'c',
    definition: "check (game_key = lower(game_key) and btrim(game_key) <> ''::text)",
  },
  sealed_product_releases_id_game_unique: {
    table: 'sealed_product_releases', type: 'u',
    definition: 'unique (id, game_key)',
  },
  sealed_product_release_pointer_game_key_check: {
    table: 'sealed_product_release_pointer', type: 'c',
    definition: "check (game_key = lower(game_key) and btrim(game_key) <> ''::text)",
  },
  sealed_product_release_pointer_pkey: {
    table: 'sealed_product_release_pointer', type: 'p',
    definition: 'primary key (game_key)',
  },
  sealed_product_release_pointer_release_game_fk: {
    table: 'sealed_product_release_pointer', type: 'f',
    definition: 'foreign key (release_id, game_key) references sealed_product_releases(id, game_key) on delete restrict',
  },
  sealed_product_release_pointer_previous_release_game_fk: {
    table: 'sealed_product_release_pointer', type: 'f',
    definition: 'foreign key (previous_release_id, game_key) references sealed_product_releases(id, game_key) on delete restrict',
  },
  sealed_product_game_release_controls_pkey: {
    table: 'sealed_product_game_release_controls', type: 'p',
    definition: 'primary key (game_key)',
  },
  sealed_product_game_release_controls_game_key_fkey: {
    table: 'sealed_product_game_release_controls', type: 'f',
    definition: 'foreign key (game_key) references games(code) on delete restrict',
  },
  sealed_product_game_release_controls_release_status_check: {
    table: 'sealed_product_game_release_controls', type: 'c',
    definition: "check (release_status = any (array['hidden'::text, 'signed_in'::text, 'public'::text]))",
  },
  sealed_product_game_release_controls_evidence_check: {
    table: 'sealed_product_game_release_controls', type: 'c',
    definition: "check (jsonb_typeof(evidence) = 'object'::text)",
  },
  sealed_product_game_release_controls_key_check: {
    table: 'sealed_product_game_release_controls', type: 'c',
    definition: "check (game_key = lower(game_key) and btrim(game_key) <> ''::text)",
  },
});

const EXPECTED_FUNCTIONS = Object.freeze({
  sealed_product_set_active_release_v1: {
    volatility: 'v',
    authenticated: false,
    service_role: true,
    definition_patterns: [
      /where pointer\.game_key = v_release\.game_key/i,
      /on conflict \(game_key\)/i,
    ],
  },
  get_active_sealed_product_pricing_v1: {
    volatility: 's',
    authenticated: true,
    service_role: true,
    definition_patterns: [
      /release\.game_key = pointer\.game_key/i,
      /catalog_game_visible_to_request_v1\(family\.game_key\)/i,
      /sealed_product_game_visible_to_request_v1\(family\.game_key\)/i,
    ],
  },
  get_active_sealed_product_pricing_v2: {
    volatility: 's',
    authenticated: true,
    service_role: true,
    definition_patterns: [
      /family\.game_key = lower\(btrim\(p_game_key\)\)/i,
      /catalog_game_visible_to_request_v1\(family\.game_key\)/i,
      /sealed_product_game_visible_to_request_v1\(family\.game_key\)/i,
    ],
  },
  sealed_product_game_visible_to_request_v1: {
    volatility: 's',
    authenticated: true,
    service_role: true,
    definition_patterns: [
      /sealed_product_game_release_controls control/i,
      /control\.release_status = 'signed_in'/i,
      /coalesce\(auth\.role\(\), ''(?:::text)?\)/i,
    ],
  },
});

function byName(rows, key) {
  return new Map(rows.map((row) => [row[key], row]));
}

function normalizeSql(value) {
  return String(value ?? '').toLowerCase().replaceAll('"', '')
    .replace(/\s+/g, ' ').replace(/\(\(/g, '(').replace(/\)\)/g, ')').trim();
}

export function validateMtgSealedMigrationReadbackV1(proof) {
  const constraints = byName(proof.constraints ?? [], 'constraint_name');
  const functions = byName(proof.functions ?? [], 'function_name');
  const relations = byName(proof.relations ?? [], 'relation_name');
  const policies = byName(proof.policies ?? [], 'relation_name');
  const tablePrivileges = byName(proof.table_privileges ?? [], 'table_name');
  const columns = byName(proof.columns ?? [], 'table_name');
  const checks = {};

  checks.migration_file_hash = proof.migration_file_sha256 ===
    MTG_SEALED_MIGRATION_SHA256_V1 &&
    proof.visibility_migration_file_sha256 ===
      MTG_SEALED_VISIBILITY_MIGRATION_SHA256_V1;
  const ledgerVersions = new Set((proof.ledger ?? []).map((row) => row.version));
  checks.ledger = proof.ledger?.length === 2 &&
    ledgerVersions.has(MTG_SEALED_MIGRATION_VERSION_V1) &&
    ledgerVersions.has(MTG_SEALED_VISIBILITY_MIGRATION_VERSION_V1) &&
    proof.ledger.every((row) => Number(row.statement_count) > 0) &&
    Number(proof.later_migration_count) === 0;
  checks.columns = ['sealed_product_releases', 'sealed_product_release_pointer',
    'sealed_product_game_release_controls']
    .every((tableName) => {
      const row = columns.get(tableName);
      return row?.column_name === 'game_key' && row?.data_type === 'text' &&
        row?.is_nullable === 'NO';
    });
  const constraintChecks = Object.fromEntries(
    Object.entries(EXPECTED_CONSTRAINTS).map(([name, expected]) => {
      const row = constraints.get(name);
      const actualDefinition = normalizeSql(row?.definition);
      const expectedDefinition = normalizeSql(expected.definition);
      const matched = row?.validated === true && row?.table_name === expected.table &&
        row?.constraint_type === expected.type &&
        actualDefinition === expectedDefinition;
      return [name, { matched, expected_table: expected.table,
        actual_table: row?.table_name ?? null, expected_type: expected.type,
        actual_type: row?.constraint_type ?? null,
        expected_definition: expectedDefinition,
        actual_definition: actualDefinition || null }];
    }),
  );
  checks.constraints = Object.values(constraintChecks)
    .every((row) => row.matched);
  checks.index = proof.indexes?.some((row) =>
    row.index_name === 'sealed_product_releases_game_state_idx' &&
    row.valid === true && row.ready === true &&
    /\(game_key, release_state, created_at desc\)/i.test(row.definition));
  const functionChecks = Object.fromEntries(
    Object.entries(EXPECTED_FUNCTIONS).map(([name, expected]) => {
      const row = functions.get(name);
      const patternChecks = expected.definition_patterns.map((pattern) => ({
        pattern: pattern.source,
        matched: pattern.test(row?.definition ?? ''),
      }));
      const matched = row?.security_definer === true &&
        row?.volatility === expected.volatility &&
        row?.search_path?.includes('search_path=pg_catalog, public') &&
        row?.public_execute === false && row?.anon_execute === false &&
        row?.authenticated_execute === expected.authenticated &&
        row?.service_role_execute === expected.service_role &&
        patternChecks.every((check) => check.matched);
      return [name, {
        matched,
        security_definer: row?.security_definer ?? null,
        expected_volatility: expected.volatility,
        actual_volatility: row?.volatility ?? null,
        search_path_locked: row?.search_path?.includes(
          'search_path=pg_catalog, public') ?? false,
        public_execute: row?.public_execute ?? null,
        anon_execute: row?.anon_execute ?? null,
        expected_authenticated_execute: expected.authenticated,
        actual_authenticated_execute: row?.authenticated_execute ?? null,
        expected_service_role_execute: expected.service_role,
        actual_service_role_execute: row?.service_role_execute ?? null,
        pattern_checks: patternChecks,
      }];
    }),
  );
  checks.functions = Object.values(functionChecks).every((row) => row.matched);
  checks.rls = ['sealed_product_releases', 'sealed_product_release_pointer',
    'sealed_product_game_release_controls']
    .every((name) => relations.get(name)?.rls_enabled === true &&
      relations.get(name)?.rls_forced === true);
  checks.policies = ['sealed_product_releases', 'sealed_product_release_pointer',
    'sealed_product_game_release_controls']
    .every((name) => {
      const row = policies.get(name);
      return row?.policy_count === 1 && row?.service_role_all_count === 1 &&
        row?.other_role_policy_count === 0;
    });
  checks.table_privileges = (() => {
    const releases = tablePrivileges.get('sealed_product_releases');
    const pointer = tablePrivileges.get('sealed_product_release_pointer');
    const controls = tablePrivileges.get('sealed_product_game_release_controls');
    return releases?.service_select === true && releases?.service_insert === true &&
      releases?.service_update === false && releases?.service_delete === false &&
      releases?.service_truncate === false && releases?.service_references === false &&
      releases?.service_trigger === false && releases?.public_any === false &&
      releases?.authenticated_any === false && releases?.anon_any === false &&
      pointer?.service_select === true && pointer?.service_insert === false &&
      pointer?.service_update === false && pointer?.service_delete === false &&
      pointer?.service_truncate === false && pointer?.service_references === false &&
      pointer?.service_trigger === false && pointer?.public_any === false &&
      pointer?.authenticated_any === false && pointer?.anon_any === false &&
      controls?.service_select === true && controls?.service_insert === true &&
      controls?.service_update === true && controls?.service_delete === false &&
      controls?.service_truncate === false && controls?.service_references === false &&
      controls?.service_trigger === false && controls?.public_any === false &&
      controls?.authenticated_any === false && controls?.anon_any === false;
  })();
  checks.data_boundaries = proof.data_boundaries?.release_null_game_count === 0 &&
    proof.data_boundaries?.pointer_null_game_count === 0 &&
    proof.data_boundaries?.cross_game_member_count === 0 &&
    proof.data_boundaries?.pointer_release_game_mismatch_count === 0 &&
    proof.data_boundaries?.pointer_previous_game_mismatch_count === 0 &&
    proof.data_boundaries?.one_piece_pointer_count === 1 &&
    proof.data_boundaries?.sealed_control_count === 2 &&
    proof.data_boundaries?.mtg_release_count === 0 &&
    proof.data_boundaries?.mtg_pointer_count === 0 &&
    proof.data_boundaries?.mtg_visible_rpc_row_count === 0 &&
    ['hidden', 'signed_in', 'public'].includes(
      proof.data_boundaries?.mtg_catalog_release_status) &&
    proof.data_boundaries?.mtg_sealed_release_status === 'hidden' &&
    ['signed_in', 'public'].includes(
      proof.data_boundaries?.one_piece_catalog_release_status) &&
    proof.data_boundaries?.one_piece_sealed_release_status ===
      proof.data_boundaries?.one_piece_catalog_release_status;

  return {
    valid: Object.values(checks).every(Boolean),
    checks,
    details: {
      constraint_checks: constraintChecks,
      function_checks: functionChecks,
    },
  };
}
