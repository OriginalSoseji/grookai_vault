# Pricing Checkpoint 50: MTG Full Catalog Batched, MSH Staged

## Status

The full pinned Scryfall English paper catalog has been transformed into a
deterministic 953-set batch manifest, and the first post-DSK set has completed
the service-only staging gate.

Marvel Super Heroes (`msh`) is durably staged in service-only tables. It is not
canonical, visible, priced, imaged, or available to the app.

## Source Provenance

Canonical catalog metadata and image references originate from the pinned
Scryfall `default_cards` bulk export:

- source URI:
  `https://api.scryfall.com/bulk-data/e2ef41e3-5778-4bc2-af3f-78eca4dd9c23`;
- JSONL object:
  `https://data.scryfall.io/default-cards/default-cards-20260813090526.jsonl.gz`;
- source SHA-256:
  `4d74b3827c1de6cc882dede2f6a75e74f67974f2bc49054693ba7e3413fb6c7c`;
- bulk objects: 116,703.

Pricing product and subtype evidence originates from the production TCGCSV
warehouse snapshot:

- warehouse rows: 117,267;
- snapshot SHA-256:
  `4931471d864b6f48234c3b51b15206de4218b7afd87c708a03fa72b94224048b`.

The Scryfall source file remained unchanged while the TCGCSV snapshot had been
refreshed after the original reconciliation. The workflow failed closed on the
hash mismatch, pinned the original Scryfall metadata, and regenerated the
read-only reconciliation against the current TCGCSV snapshot before batching.

Permanent reconciliation evidence:

- `docs/audits/pricing/mtg_canonical_catalog_reconciliation_v1/2026-08-13T21-56-22Z/`

## Full Catalog Truth

The complete frozen candidate set is:

- 104,712 eligible English paper parent prints;
- 953 Scryfall sets;
- 158,262 finish-specific child printing candidates;
- 104,550 parents with source image references;
- 144,462 collision-free exact TCGPlayer Normal/Foil mappings;
- 142,670 exact mapped lanes with positive current `marketPrice`;
- 26 unique ambiguous source lanes quarantined;
- 20 supported Normal/Foil lanes withheld from mapping because ownership is
  ambiguous;
- 42 candidate-to-standard-lane assignments affected by those ambiguities.

DSK accounts for 417 already-canonical parents. The remaining governed scope is:

- 104,295 parent candidates;
- 952 sets.

The earlier count of 2,866 was never the MTG catalog size. It was the relational
row count for the DSK canary only.

Permanent manifest evidence:

- `docs/audits/pricing/mtg_canonical_catalog_batch_manifest_v1/2026-08-13T22-10-07Z/`

The manifest preserves all 953 set payload fingerprints and hashes. Large
per-set payloads remain reproducible from the pinned source files under the
ignored `.tmp` workspace. The exact selected MSH payload is preserved as a
permanent audit artifact.

## Set Metadata Drift

Scryfall's `plst` set carries multiple card-level release dates under one set
identity. The batch builder does not invent one canonical date:

- each card's source release date is preserved in its source mapping evidence;
- the set-level release date is `null` when card-level values conflict;
- all observed release dates and the abstention decision are recorded in the
  manifest.

Non-expansion Scryfall set types are also not forced into a Grookai set role.
Their `set_role` remains `null` unless a supported role mapping exists.

## Bounded Selection Policy

The next batch selector is frozen to:

- released on or before 2026-08-13;
- Scryfall `expansion` set type;
- at least 100 eligible parents;
- at least 95% exact price-lane coverage;
- zero quarantined collision lanes;
- newest release first, then positive market-lane count, then set code.

This excluded the unreleased Star Trek set and selected Marvel Super Heroes.

## MSH Staging Proof

Selected MSH payload:

- producing commit: `eeaadbcb2`;
- payload fingerprint:
  `73d0b68c08ff462cc2f853520faa491a73d9d7e27db9c93afcc95bfc06c00e38`;
- payload file SHA-256:
  `e49748977f8688aa852b9f5366cfb68c8b2f6ed92ab2db284f8b1ec9ad96a12f`;
- immutable batch ID: `276cc9f7-0159-5df3-874c-73ea04e741a4`;
- staged rows SHA-256:
  `788eaf7637311ce021f531d70430f05700594eb03fd48a0c00bd8e0e4b7f0e6c`;
- mutation contract SHA-256:
  `0bb200c5e273f99fcb3090d54b2accfa0b781d26d985584fbbe59882e04a387c`.

MSH row counts:

- 1 set;
- 453 parent cards;
- 453 identity rows;
- 865 finish-specific printings;
- 453 Scryfall mappings;
- 864 exact TCGPlayer printing mappings;
- 3,089 total immutable staging rows.

All 864 mapped lanes exist in the current warehouse observation and have a
positive `marketPrice`.

Proof sequence:

1. read-only production preflight with zero findings;
2. 3,089-row transactional staging dry-run;
3. exact in-transaction readback and security verification;
4. complete rollback with no durable MSH batch;
5. durable service-only staging apply;
6. independent read-only post-apply reconciliation with zero findings.

Permanent evidence:

- preflight:
  `docs/audits/pricing/mtg_canonical_catalog_set_stage_preflight_v1/2026-08-13T22-15-33Z/`;
- rollback dry-run:
  `docs/audits/pricing/mtg_canonical_catalog_set_stage_writer_v1/2026-08-13T22-16-18Z_dry_run/`;
- durable apply:
  `docs/audits/pricing/mtg_canonical_catalog_set_stage_writer_v1/2026-08-13T22-25-15Z_apply/`;
- independent readback:
  `docs/audits/pricing/mtg_canonical_catalog_set_stage_post_apply_readback_v1/2026-08-13T22-27-42Z/`.

## Production Readback

- immutable staging batches: 2;
- immutable staging rows: 5,955;
- DSK staged rows: 2,866;
- MSH staged rows: 3,089;
- canonical MTG sets: 1;
- canonical MTG parent cards: 417;
- canonical MTG identities: 417;
- canonical MTG printings: 807;
- canonical MSH sets: 0;
- canonical MSH cards: 0;
- release status: `hidden`;
- anonymous MTG visibility: 0;
- authenticated MTG visibility: 0;
- MTG search visibility: 0;
- service-visible Pokémon parents: 58,769;
- authenticated-visible Pokémon parents: 58,768;
- independent findings: 0.

## Invariants

- Staging tables remain service-only and immutable by workflow.
- MTG release remains hidden behind restrictive policies.
- Canonical tables are not changed by staging.
- No image or Storage write is part of catalog staging.
- No price publication is part of catalog staging.
- No app or Vault surface consumes staged rows.
- Ambiguous TCGPlayer lanes remain unmapped.
- Pokémon data and visibility remain unchanged.

## Exact Next Gate

Generalize the already-proven DSK hidden canonical promotion contract so it can
consume the frozen MSH staging batch without hard-coded DSK counts or set code.
Run only a transactional rollback proof first. Require exact 453-parent,
865-printing, and mapping readback while MSH remains hidden from both client
roles and DSK remains unchanged.

Do not durably promote MSH, process additional sets, self-host images, update
image pointers, publish prices, activate MTG visibility, or write Vault data
until that generalized promotion rollback proof passes.
