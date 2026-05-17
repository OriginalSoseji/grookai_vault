# Variant Authority Model V2 Plan

Status: no-write planning only. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, route changes, card backfills, variant backfills, or production data mutation.

## Purpose

The Pokemon master-set audit proved that the DB cannot represent true collector master sets with the current variant shape. The immediate goal is not to backfill variants. The goal is to define the authority model that must exist before any future variant implementation can safely begin.

This plan follows the already-approved remediation order:

1. Set canonicalization
2. Missing set universe decision
3. Number normalization
4. Missing card checklist backfill
5. Variant model remediation

Variant work stays last because variants depend on canonical set ownership and printed card identity.

## Source Evidence

- `variant_model_plan.md`
- `docs/audits/pokemon_master_set_audit_v1/summary.json`
- `number_normalization_evidence_20260517.md`
- `missing_cards_backfill_evidence_20260517.md`
- `set_alias_prewrite_evidence_20260517.md`

Current gap:

| Source | Variant slots/signals |
| --- | ---: |
| DB variant slots | 2,901 |
| TCGdex signals | 21,066 |
| PokemonTCG/TCGPlayer signals | 32,449 |

The gap is too large to treat as a simple data patch. It needs a separate authority contract.

## Authority Definitions

### Canonical Card Identity

Canonical card identity is the numbered printed card in one canonical English physical set. It is the checklist identity used for set completion. A canonical card identity should not multiply because a source exposes price buckets, finishes, stamps, or product-specific terms.

Required identity fields:

- canonical set identifier
- printed card number
- printed card name
- source provenance
- active identity/domain hash, once the identity contract is satisfied

### Finish / Printing Variants

Finish or printing variants are physical print treatments of the same canonical card identity, such as normal, holofoil, reverse holofoil, first edition, unlimited, cosmos holo, cracked ice, or non-holo deck exclusives.

These should become normalized child records of the canonical card identity, not separate checklist cards, unless the card has a distinct printed number or source-proven checklist identity.

### Stamped Canonical Variants

Stamped canonical variants are collector-recognized physical variants that may deserve first-class tracking even when they share the same printed number. Examples include prerelease stamps, staff stamps, event stamps, league stamps, winner stamps, and product-stamped variants.

Stamped variants need stronger provenance than generic finish variants because they can overlap with product distribution and market listings.

### Market / Product Variants

Market variants are source price or sales buckets, such as TCGPlayer price keys or PokemonTCG API `tcgplayer.prices` keys. Product variants are distinctions that exist because a product feed, sealed-product lane, or marketplace SKU exposes them.

These are not automatically collector variant authority. They may be useful evidence, but they must be classified before they can affect canonical variant rows.

### Source-Specific Variants

Source-specific variants are terms from TCGdex, PokemonTCG API, TCGPlayer, JustTCG, PkmnCards, or other feeds that do not yet map cleanly into the normalized vocabulary.

These should be preserved as evidence rows and translated through an approved vocabulary table, not written directly into canonical variant fields.

## What Not To Backfill Yet

Do not backfill:

- reverse-holo, holo, normal, first-edition, or unlimited rows from source JSON alone
- TCGPlayer price keys as collector variants
- PokemonTCG API price buckets as canonical variants
- TCGdex variant signals in hard-stop set groups
- variants for cards with null or disputed printed numbers
- variants for cards in unresolved alias/canonicalization groups
- stamped variants without product or checklist evidence
- source-specific product variants without vocabulary approval
- variant rows during missing card checklist backfill

The only safe near-term use of variant evidence is read-only classification and source comparison.

## Future Schema / Write Requirements

Future implementation should create or designate a `VARIANT_AUTHORITY_MODEL_V2` contract before any variant writes. The contract should define:

- canonical variant authority rows keyed to canonical `card_prints`
- source evidence rows that preserve raw source terms and payload references
- a normalized vocabulary for finish, edition, stamp, product, and market-only terms
- confidence/provenance fields for source agreement and conflict review
- explicit market-only classification so price keys do not become collector variants accidentally
- compatibility rules for current `variant_key` and `variants` JSON
- uniqueness rules that prevent duplicate variant rows for the same card/variant authority
- post-write audit queries proving card identity count did not change
- rollback by inserted authority batch, not broad deletion

Likely future tables or equivalents:

- `variant_authority_terms`
- `card_print_variant_authority`
- `card_print_variant_source_evidence`
- `variant_authority_batches`
- `variant_authority_conflicts`

This plan does not require those exact table names. It requires those responsibilities.

## Hard Stop Gates

No variant write plan should be drafted unless all gates pass:

- set canonicalization hard stops are excluded or resolved
- canonical target set exists and owns the card identity
- `card_prints.number` and comparable printed identity are proven
- active identity/domain hash conflicts are zero for the candidate scope
- candidate card rows are not part of missing-card backfill in the same transaction
- source terms map to approved vocabulary entries
- market-only signals are classified as market-only
- stamped variants have source evidence beyond price-only keys
- source disagreement is captured as review debt, not collapsed into a write
- post-write verification can prove canonical card counts unchanged

## Future No-Write Evidence Pack

Before any implementation plan, produce a read-only evidence pack by canonical set:

- DB current variant slot count
- TCGdex variant signal count
- PokemonTCG/TCGPlayer signal count
- existing `variant_key` and `variants` JSON coverage
- source term vocabulary inventory
- cards blocked by number normalization
- cards blocked by canonicalization hard stops
- market-only terms
- stamped/product terms requiring manual review

## No-Write Queue

1. Freeze variant writes while canonicalization, number normalization, and missing-card planning continue.
2. Build the source vocabulary inventory in read-only mode.
3. Split signals into collector, stamped, market-only, product-only, and unknown lanes.
4. Draft the `VARIANT_AUTHORITY_MODEL_V2` contract and acceptance tests.
5. Produce a future dry-run implementation plan only after the contract is approved.

## Recommendation

Do not implement variants during missing-card backfill. Missing cards should restore canonical checklist identity only. Variants require a separate authority model, separate evidence pack, and separate authorization.
