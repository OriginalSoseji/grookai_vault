# Pricing Checkpoint 54: Cross-TCG Sealed Schema Applied; Canary Selection Ready

## Status

The private cross-TCG sealed-product domain is durably present in production.
Its schema, migration ledger, RLS, policies, narrow grants, effective
privileges, and empty row state passed both the writer's fresh readback and a
separate read-only verifier.

No sealed product data, release pointer, pricing value, publication row, card
identity mutation, Storage object, or app-facing access was created.

## Producing Provenance

- Schema-producing commit: `1aae77df329b69608c4bf424705450ed1efdcacb`
- Schema audit commit: `87c1ba88a`
- Read-only canary planner commit: `74bd8915dcd5a625ebe9370e773c438f02eeaa0a`
- Canary selection audit commit: `861e83603`
- Migration SHA-256:
  `f588987c10cdb80f641d6da8ca0f4892afdb6b0d7175fe6e2c0cdc2c6be972d0`
- Migration-plan fingerprint:
  `9ba9803731eac32e3fd63dc4bdf3e07b781f3a71d9f919cf15b0f2b552ab225b`
- Passing production preflight fingerprint:
  `e8e7915888865e5b227f6b09b7a1a144d4780ae15ea0aebe552e6b0c232da740`
- Schema apply-plan fingerprint:
  `0325db8d8a4328cacba7026e2e37d3ac8a15d3cb107e98de866645e793b7942b`
- Read-only canary selection fingerprint:
  `8077bdc2c9368a62ff302517666c69c5462b4594d8752047e310228a5ac2cc09`

## Security Truths

- Ten sealed-domain tables exist with RLS enabled and forced.
- Ten service-role-only policies exist.
- Nine append-only data tables expose effective `SELECT` and `INSERT` only to
  `service_role`.
- The release pointer exposes effective `SELECT` only; mutation is confined to
  the guarded security-definer release function.
- Effective `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER`
  privileges are absent from `service_role` on every sealed table.
- Only the release freeze and compare-and-swap activation functions are
  executable by `service_role`.
- `anon` and `authenticated` have no effective table or function access.
- The migration ledger contains one exact row for version `20260814060000`.

## Empty-State Proof

- Sealed tables: `10`
- Total sealed data rows: `0`
- Active sealed release pointer rows: `0`
- App-facing sealed views/RPCs: `0`
- Published sealed releases: `0`
- MTG release state during verification: `hidden`
- Relevant sealed and MTG regression tests: `161/161` passing

## Frozen Canary Selection

The read-only planner selected ten current TCGPlayer products as one review
packet. Every candidate has an exact source payload hash, deterministic
classification evidence, and no canonical or publication authority.

| Game | Product ID | Source product | Package form |
|---|---:|---|---|
| Magic | 96138 | Dragons of Tarkir - Booster Box Case (6 boxes) | case |
| Magic | 496072 | Timey-Wimey Commander Deck | deck |
| One Piece | 502983 | Ultra Deck: The Three Captains Display | deck display |
| One Piece | 521160 | Memorial Collection - Booster Pack | pack |
| One Piece | 561689 | Double Pack Set Volume 5 | bundle |
| Pokemon | 591147 | Triple Whammy Tin [Slaking] | tin |
| Magic | 637680 | English FINAL FANTASY Bundle | collection |
| Pokemon Japan | 643132 | Pikachu ex & Snorlax ex Start Deck | deck |
| Pokemon | 644352 | Mega Evolution Booster Pack | pack |
| Pokemon Japan | 683774 | Ninja Spinner Booster Box | booster box |

## Permanent Boundaries

- Candidate classification is not canonical identity authority.
- The selection packet is not a writer payload.
- No manufacturer, family, variant, language, region, contents, or release
  claim may be promoted without evidence-backed review.
- No price value may be written in the no-publication canary.
- The active release pointer must remain unchanged.
- No sealed row may enter card, Vault, pricing publication, or client-facing
  tables.

## Audit Evidence

- `docs/audits/pricing/cross_tcg_sealed_product_schema_apply_v1/production_schema_apply_effective_privileges_v2/`
- `docs/audits/pricing/cross_tcg_sealed_product_schema_apply_v1/production_schema_apply_effective_privileges_v2_independent_verify/`
- `docs/audits/pricing/cross_tcg_sealed_product_no_publication_canary_v1/2026-08-14T06-56-59-077Z_read_only_selection/`

All generated artifact manifests were independently hash-verified.

## Exact Next Gate

Review the ten candidates as one bounded packet. After that review, construct a
new, separately fingerprinted mutation payload containing only confirmed
candidates and evidence-backed family/variant fields. The future writer must
stage candidates first, independently read them back, keep the release in
`draft`, leave the active pointer unchanged, and stop before publication.
