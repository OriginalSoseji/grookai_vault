export const MTG_SEALED_MIGRATION_VERSION_V1 = '20260903130000';
export const MTG_SEALED_MIGRATION_SHA256_V1 =
  '630463aa7af959d9e885423baa5fda948a759c0263a92805c8318828743ca0a6';

const EXPECTED_CONSTRAINTS = Object.freeze({
  sealed_product_releases_game_key_check: {
    table: 'sealed_product_releases', type: 'c',
    definition: /check \(\(?game_key = lower\(game_key\)\)? and \(?btrim\(game_key\) <> ''(?:::text)?\)?\)/,
  },
  sealed_product_releases_id_game_unique: {
    table: 'sealed_product_releases', type: 'u',
    definition: /unique \(id, game_key\)/,
  },
  sealed_product_release_pointer_game_key_check: {
    table: 'sealed_product_release_pointer', type: 'c',
    definition: /check \(\(?game_key = lower\(game_key\)\)? and \(?btrim\(game_key\) <> ''(?:::text)?\)?\)/,
  },
  sealed_product_release_pointer_pkey: {
    table: 'sealed_product_release_pointer', type: 'p',
    definition: /primary key \(game_key\)/,
  },
  sealed_product_release_pointer_release_game_fk: {
    table: 'sealed_product_release_pointer', type: 'f',
    definition: /foreign key \(release_id, game_key\) references (?:public\.)?sealed_product_releases\(id, game_key\) on delete restrict/,
  },
  sealed_product_release_pointer_previous_release_game_fk: {
    table: 'sealed_product_release_pointer', type: 'f',
    definition: /foreign key \(previous_release_id, game_key\) references (?:public\.)?sealed_product_releases\(id, game_key\) on delete restrict/,
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
    ],
  },
  get_active_sealed_product_pricing_v2: {
    volatility: 's',
    authenticated: true,
    service_role: true,
    definition_patterns: [
      /family\.game_key = lower\(btrim\(p_game_key\)\)/i,
      /catalog_game_visible_to_request_v1\(family\.game_key\)/i,
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
    MTG_SEALED_MIGRATION_SHA256_V1;
  checks.ledger = proof.ledger?.length === 1 &&
    proof.ledger[0].version === MTG_SEALED_MIGRATION_VERSION_V1 &&
    Number(proof.ledger[0].statement_count) > 0 &&
    Number(proof.later_migration_count) === 0;
  checks.columns = ['sealed_product_releases', 'sealed_product_release_pointer']
    .every((tableName) => {
      const row = columns.get(tableName);
      return row?.column_name === 'game_key' && row?.data_type === 'text' &&
        row?.is_nullable === 'NO';
    });
  checks.constraints = Object.entries(EXPECTED_CONSTRAINTS)
    .every(([name, expected]) => {
      const row = constraints.get(name);
      return row?.validated === true && row?.table_name === expected.table &&
        row?.constraint_type === expected.type &&
        expected.definition.test(normalizeSql(row?.definition));
    });
  checks.index = proof.indexes?.some((row) =>
    row.index_name === 'sealed_product_releases_game_state_idx' &&
    row.valid === true && row.ready === true &&
    /\(game_key, release_state, created_at desc\)/i.test(row.definition));
  checks.functions = Object.entries(EXPECTED_FUNCTIONS).every(([name, expected]) => {
    const row = functions.get(name);
    return row?.security_definer === true && row?.volatility === expected.volatility &&
      row?.search_path?.includes('search_path=pg_catalog, public') &&
      row?.public_execute === false && row?.anon_execute === false &&
      row?.authenticated_execute === expected.authenticated &&
      row?.service_role_execute === expected.service_role &&
      expected.definition_patterns.every((pattern) => pattern.test(row.definition));
  });
  checks.rls = ['sealed_product_releases', 'sealed_product_release_pointer']
    .every((name) => relations.get(name)?.rls_enabled === true &&
      relations.get(name)?.rls_forced === true);
  checks.policies = ['sealed_product_releases', 'sealed_product_release_pointer']
    .every((name) => {
      const row = policies.get(name);
      return row?.policy_count === 1 && row?.service_role_all_count === 1 &&
        row?.other_role_policy_count === 0;
    });
  checks.table_privileges = (() => {
    const releases = tablePrivileges.get('sealed_product_releases');
    const pointer = tablePrivileges.get('sealed_product_release_pointer');
    return releases?.service_select === true && releases?.service_insert === true &&
      releases?.service_update === false && releases?.service_delete === false &&
      releases?.service_truncate === false && releases?.service_references === false &&
      releases?.service_trigger === false && releases?.public_any === false &&
      releases?.authenticated_any === false && releases?.anon_any === false &&
      pointer?.service_select === true && pointer?.service_insert === false &&
      pointer?.service_update === false && pointer?.service_delete === false &&
      pointer?.service_truncate === false && pointer?.service_references === false &&
      pointer?.service_trigger === false && pointer?.public_any === false &&
      pointer?.authenticated_any === false && pointer?.anon_any === false;
  })();
  checks.data_boundaries = proof.data_boundaries?.release_null_game_count === 0 &&
    proof.data_boundaries?.pointer_null_game_count === 0 &&
    proof.data_boundaries?.cross_game_member_count === 0 &&
    proof.data_boundaries?.pointer_release_game_mismatch_count === 0 &&
    proof.data_boundaries?.pointer_previous_game_mismatch_count === 0 &&
    proof.data_boundaries?.one_piece_pointer_count === 1 &&
    proof.data_boundaries?.mtg_release_count === 0 &&
    proof.data_boundaries?.mtg_pointer_count === 0 &&
    proof.data_boundaries?.mtg_visible_rpc_row_count === 0 &&
    proof.data_boundaries?.mtg_release_status === 'hidden';

  return {
    valid: Object.values(checks).every(Boolean),
    checks,
  };
}
