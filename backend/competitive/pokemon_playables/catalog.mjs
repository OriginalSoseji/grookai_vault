import { assert, collectorNumber, normalize, uniqueSorted, UUID } from './common.mjs';
import fs from 'node:fs/promises';

export async function loadCanonicalCatalog(client, ids) {
  ids = uniqueSorted(ids);
  assert(ids.length <= 20000 && ids.every(id => UUID.test(id)), 'CATALOG_ID_BOUND');
  const result = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = ids.slice(offset, offset + 100);
    const [parentResult, identityResult] = await Promise.all([
      client.from('card_prints').select('id,gv_id,name,set_code,number,rarity,identity_domain,data_quality_flags').in('id', batch),
      client.from('card_print_identity').select('id,card_print_id,identity_domain,identity_key_version,set_code_identity,printed_number,normalized_printed_name,source_name_raw,identity_payload,identity_key_hash,is_active').in('card_print_id', batch).eq('is_active', true),
    ]);
    assert(!parentResult.error && !identityResult.error, 'CATALOG_READ_FAILED');
    const identities = new Map();
    for (const identity of identityResult.data) {
      if (!identities.has(identity.card_print_id)) identities.set(identity.card_print_id, []);
      identities.get(identity.card_print_id).push(identity);
    }
    const verifyParent = async parent => {
      const owners = identities.get(parent.id) ?? [];
      const identity = owners.length === 1 ? owners[0] : null;
      let consistent = false;
      if (identity && identity.identity_domain === parent.identity_domain &&
          normalize(identity.set_code_identity) === normalize(parent.set_code) &&
          collectorNumber(identity.printed_number) === collectorNumber(parent.number) &&
          normalize(identity.normalized_printed_name) === normalize(parent.name)) {
        // Use the existing canonical serializer/hash authority; do not reimplement its identity law in JavaScript.
        const hash = await client.rpc('card_print_identity_hash_v1', {
          p_identity_domain: identity.identity_domain, p_identity_key_version: identity.identity_key_version,
          p_set_code_identity: identity.set_code_identity, p_printed_number: identity.printed_number,
          p_normalized_printed_name: identity.normalized_printed_name, p_source_name_raw: identity.source_name_raw,
          p_identity_payload: identity.identity_payload,
        });
        assert(!hash.error, 'CANONICAL_HASH_VERIFICATION_FAILED');
        consistent = hash.data === identity.identity_key_hash;
      }
      const visibility = parent.data_quality_flags?.app_visibility_v1;
      return { id: parent.id, gv_id: parent.gv_id, name: parent.name, rarity: parent.rarity, set_code: parent.set_code, number: parent.number,
        identity_id: identity?.id ?? null, identity_key_hash: identity?.identity_key_hash ?? null,
        identity_active: Boolean(identity), identity_domain: parent.identity_domain, identity_consistent: consistent,
        publicly_visible: visibility?.status !== 'suppressed' && parent.identity_domain === 'pokemon_eng_standard' };
    };
    for (let offset = 0; offset < parentResult.data.length; offset += 4) {
      result.push(...await Promise.all(parentResult.data.slice(offset, offset + 4).map(verifyParent)));
    }
  }
  return result.sort((a, b) => a.id.localeCompare(b.id));
}

export async function loadTcgdexMatchingBindings(client, externalIds) {
  const bindings = await loadTcgdexCohortBindings(client, externalIds);
  const unmapped = externalIds.filter(id => !bindings.mappings.some(mapping => mapping.external_id === id));
  const sourceCoordinates = unmapped.map(id => ({ set: id.slice(0, id.lastIndexOf('-')), number: id.slice(id.lastIndexOf('-') + 1) }));
  const setCodes = uniqueSorted(sourceCoordinates.map(row => row.set)), candidates = [];
  for (let offset = 0; offset < setCodes.length; offset += 10) {
    const result = await client.from('card_prints').select('id,set_code,number').eq('identity_domain', 'pokemon_eng_standard')
      .in('set_code', setCodes.slice(offset, offset + 10)).limit(1000);
    assert(!result.error && result.data.length < 1000, 'MATCHING_GAP_CATALOG_READ_FAILED_OR_TRUNCATED');
    candidates.push(...result.data.filter(parent => sourceCoordinates.some(row => row.set === parent.set_code && collectorNumber(row.number) === collectorNumber(parent.number))));
  }
  const candidateIds = uniqueSorted(candidates.map(parent => parent.id)), priorMappings = [];
  for (let offset = 0; offset < candidateIds.length; offset += 100) {
    const result = await client.from('external_mappings').select('id,source,external_id,card_print_id,active,meta')
      .eq('source', 'tcgdex').in('card_print_id', candidateIds.slice(offset, offset + 100)).limit(1000);
    assert(!result.error && result.data.length < 1000, 'MATCHING_GAP_MAPPING_READ_FAILED_OR_TRUNCATED');
    priorMappings.push(...result.data);
  }
  // Candidate parents are isolated from mapped catalog members. They are review
  // hints and cannot supply the active ownership bridge required by the engine.
  return { ...bindings, unmapped_parent_candidates: await loadCanonicalCatalog(client, candidateIds),
    unmapped_parent_mappings: priorMappings.sort((a, b) => String(a.id).localeCompare(String(b.id))) };
}

export async function loadTcgdexCohortBindings(client, externalIds) {
  assert(Array.isArray(externalIds) && externalIds.length <= 500, 'COHORT_PROVIDER_ID_BOUND');
  const first = [];
  for (let offset = 0; offset < externalIds.length; offset += 100) {
    const result = await client.from('external_mappings').select('id,source,external_id,card_print_id,active,meta')
      .eq('source', 'tcgdex').eq('active', true).in('external_id', externalIds.slice(offset, offset + 100)).limit(1000);
    assert(!result.error && result.data.length < 1000, 'COHORT_MAPPING_READ_FAILED_OR_TRUNCATED');
    first.push(...result.data);
  }
  const parentIds = uniqueSorted(first.map(mapping => mapping.card_print_id)), mappings = [];
  for (let offset = 0; offset < parentIds.length; offset += 100) {
    const result = await client.from('external_mappings').select('id,source,external_id,card_print_id,active,meta')
      .eq('source', 'tcgdex').eq('active', true).in('card_print_id', parentIds.slice(offset, offset + 100)).limit(1000);
    assert(!result.error && result.data.length < 1000, 'COHORT_MAPPING_READ_FAILED_OR_TRUNCATED');
    mappings.push(...result.data);
  }
  return { mappings: mappings.sort((a, b) => String(a.id).localeCompare(String(b.id))), catalog: await loadCanonicalCatalog(client, parentIds) };
}

export async function assertRemoteEnvironment(client, expectedProject) {
  assert(expectedProject === 'ycdxbpibncqcchqiihfz' && new URL(process.env.SUPABASE_URL).hostname === `${expectedProject}.supabase.co`, 'ENVIRONMENT_MISMATCH');
  const config = await fs.readFile(new URL('../../../supabase/config.toml', import.meta.url), 'utf8');
  assert(new RegExp(`^project_id\\s*=\\s*"${expectedProject}"\\s*$`, 'm').test(config), 'CLI_PROJECT_MISMATCH');
  assert(!process.env.GV_USER_ACCESS_TOKEN, 'WORKER_REQUIRES_SYSTEM_CONTEXT');
  const counts = {};
  for (const [table, minimum] of [['card_prints', 40000], ['sets', 150], ['card_print_traits', 5000]]) {
    const result = await client.from(table).select('id', { count: 'exact', head: true });
    assert(!result.error, 'ENVIRONMENT_SANITY_READ_FAILED');
    assert(result.count >= minimum, 'ENVIRONMENT_COUNTS_MISMATCH');
    counts[table] = result.count;
  }
  return counts;
}
