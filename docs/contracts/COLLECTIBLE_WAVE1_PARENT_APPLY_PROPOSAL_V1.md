# Collectible Wave 1 Parent Apply Proposal V1

## Purpose

Define the first deterministic canonical parent-card payload for the hidden
Yu-Gi-Oh and Gundam foundations. This contract promotes only the 26,719 rows
that the frozen card identity proposal marked `proposal_ready`.

## Frozen Input

- source workflow run: `33239106476`;
- producer SHA: `d568c746f15ab506992dde19c7e2db01cd2c93a7`;
- source proposal fingerprint:
  `968e0329fc021a8f5602c3f253876671127a11ba33749ce79baaaae21c01157f`;
- parent proposals: 27,835;
- proposal-ready parents: 26,719;
- review-required parents excluded: 1,116;
- selected source printing evidence rows: 31,766.

The exact source files are accepted only when their byte counts and SHA-256
digests match the frozen tuple in code.

## Canonical Grain

One parent row is created per exact game, approved canonical set, English
printed collector number, and printed name from the frozen proposal. The
payload defines deterministic UUIDs, readable collision-resistant GV-IDs, and
one active parent identity per row.

The domains are:

- `yugioh_eng_parent`;
- `gundam_eng_parent`.

These names deliberately describe parent identity. They do not claim an exact
printing, rarity, finish, edition, treatment, or artwork variant.

## Source Evidence

Every one of the 31,766 selected source printing candidates becomes an
independent `card_print_identity_source_evidence` row. The row remains linked
to the parent identity but retains its source candidate ID, source hash, source
rarity label, and source product ID where one exists.

Source rarity is evidence only. It cannot populate parent `rarity`,
`variant_key`, external mapping, finish, image, or printing identity.

## Migration Candidate

The generated migration candidate:

1. fails closed unless the current identity-domain constraint is the expected
   pre-migration version;
2. adds only the two parent domains;
3. inserts the exact parent, identity, and source-evidence payloads;
4. changes no release control;
5. contains no migration-ledger statement;
6. contains no update, delete, truncation, mapping, image, pricing,
   publication, search, or Vault mutation.

The file is a candidate. Its existence grants no execution authority.

## Production Rollback Proof

The only executable workflow in this gate strips the migration transaction
wrapper, opens its own production transaction, runs the exact candidate,
verifies all rows and payload hashes, confirms both app roles see zero rows,
and always issues `ROLLBACK`.

The proof must establish:

- 26,719 transient `card_prints` rows;
- 26,719 transient active identity rows;
- 31,766 transient source-evidence rows;
- exact expected row hashes;
- only those three tables received attributable inserts;
- Yu-Gi-Oh and Gundam remained hidden from `anon` and `authenticated`;
- no migration-ledger change;
- complete post-rollback absence;
- unchanged protected counts, controls, games, sets, and identity constraint.

## Stop Boundary

Stop after the exact-SHA rollback proof and permanent checkpoint. Do not apply
the migration durably. Do not include the 1,116 review-required parents, the
43-row parser delta, candidates outside approved sets, child printings,
external mappings, images, prices, search, publication, or Vault data.
