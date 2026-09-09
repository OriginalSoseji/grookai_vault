import { CANARY_BRANCH, CANARY_PROJECT } from '../../backend/pricing/sealed_ownership_account_canary_plan_v1.mjs';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const hash = 'a'.repeat(64);
export function fixture() {
  return {
    repository: { branch: CANARY_BRANCH, commit: 'b'.repeat(40), clean: true },
    snapshot: {
      project_ref: CANARY_PROJECT, captured_at: '2026-09-09T01:00:00.000Z',
      guard: { transaction_read_only: 'on', default_transaction_read_only: 'on' },
      ledger_matches: true, canonical: { cards: 170404, sets: 3397, traits: 32903 },
      control: { enabled: false, canary_enabled: false },
      grants: 0, allowed_variants: 0, sealed_copies: 0, sealed_requests: 0,
      founders: [{ user_id: id(1), has_vault_owner: true, lifetime_created: 0 }],
      security: ['sealed_ownership_canary_grants_v1', 'sealed_ownership_canary_variants_v1'].map(relname =>
        ({ relname, rls: true, forced_rls: true, anon_access: false, authenticated_access: false })),
      policy_hash: hash, protected_state_hash: hash,
      candidates: ['pokemon', 'mtg'].map((game_key, i) => ({
        game_key, variant_id: id(i + 2), price_release_id: id(4), image_release_id: id(5),
        language_code: 'en', currency: 'USD', source_provider: 'tcgplayer', source_product_id: 123 + i,
        canonical_name: `${game_key} test box`, market_price: '10.50', observed_on: '2026-09-09',
        image_storage_bucket: 'user-card-images', image_content_sha256: hash,
        image_object_path: `sealed/${game_key}/sha256/aa/${hash}.jpg`,
        image_bytes: 100, image_width: 200, image_height: 300,
        evidence_fingerprint: hash, image_assertion_fingerprint: hash, image_member_fingerprint: hash,
      })),
    },
  };
}

