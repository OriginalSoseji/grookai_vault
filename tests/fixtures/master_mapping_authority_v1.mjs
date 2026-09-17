import { createHash } from 'node:crypto';
import { fixture as masterFixture, seal } from './warehouse_printing_authority_v1.mjs';
import { printingManifestHash } from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import { planTcgplayerExactMappingCandidateV1 } from '../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export function reviewFixture(f) {
  const projection = structuredClone(f.manifest);
  delete projection.fingerprint;
  delete projection.authority.review;
  const review = JSON.parse(f.artifacts.get('review'));
  review.projection_sha256 = printingManifestHash(projection);
  const bytes = Buffer.from(JSON.stringify(review));
  f.artifacts.set('review', bytes);
  f.manifest.authority.review.sha256 = digest(bytes);
  f.manifest = seal(f.manifest);
}

// Synthetic evidence only. Never use these reviews or identities in a real apply.
export function fixture() {
  const f = masterFixture();
  const candidate = planTcgplayerExactMappingCandidateV1({ source: {
    source_product_id: 123, source_product_name: 'Fixture - 001/010', source_group_id: 456,
    source_group_name: 'Synthetic fixture set', printed_number: '001/010',
    has_printed_number_evidence: true, active_source_mapping_count: 0,
    source_subtypes: ['Holofoil'], supporting_gap_observation_ids: ['77777777-7777-4777-8777-777777777777'], supporting_gap_row_count: 1,
  }, directTargets: [{ card_print_id: f.parent.id, gv_id: f.parent.gv_id,
    set_id: f.parent.set_id, set_code: 'test', name: f.parent.name, number: '1', variant_key: '',
    active_standard_identity_count: 1, active_tcgplayer_mapping_count: 0,
    embedded_external_id: 'tcgcsv:456:123' }] });
  const source = Buffer.from('Synthetic exact product-to-parent identity evidence; test-only.');
  f.artifacts.set('mapping-source', source);
  f.manifest.authority.source_artifacts.push({ ref: 'mapping-source', sha256: digest(source),
    kind: 'exact_printing_mapping', url_or_identifier: 'test-only-product-123', retrieved_at: '2026-09-17T00:00:00Z' });
  f.manifest.external_mapping_assertions = [{ source: 'tcgplayer', external_id: '123',
    card_print_id: f.parent.id, candidate_fingerprint: candidate.candidate_fingerprint,
    source_ref: 'mapping-source', source_sha256: digest(source) }];
  reviewFixture(f);
  const liveParent = { ...f.manifest.parents[0], number: '1' };
  delete liveParent.printed_coordinate;
  return { ...f, selected: [candidate], liveTargets: [{ card_print_id: f.parent.id, parent_snapshot: liveParent }] };
}
