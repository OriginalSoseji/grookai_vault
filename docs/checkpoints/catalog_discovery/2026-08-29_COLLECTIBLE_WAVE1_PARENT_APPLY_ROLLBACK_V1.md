# Collectible Wave 1 Parent Apply Rollback V1

## Context

The frozen Wave 1 card identity proposal supplied 27,835 candidate parent
identities across the 505 applied hidden Yu-Gi-Oh and Gundam sets. Exactly
26,719 parents were proposal-ready; 1,116 remained review-required because of
identity conflict or unresolved alternative-artwork ownership.

## Problem

The proposal had not yet defined durable parent UUIDs, GV-IDs, identity
domains, source-evidence rows, or a production-safe migration payload. Source
rarity and source-product rows also had to remain printing evidence rather than
being promoted into parent rarity, finish, variant, mapping, or image truth.

## Risk

- Source printing rows could be mistaken for parent identities.
- Rarity could be converted into an unsupported finish or variant.
- The generated `card_prints.number_plain` projection collapses lettered
  collector-number sections and can create false standard-coordinate clashes.
- New identity domains could replace or weaken existing protected domains.
- A large data migration could partially persist or expose hidden games.
- A rollback claim without exact post-transaction proof could conceal writes.

## Decision

Build a self-contained candidate migration from only the 26,719
`proposal_ready` parents. Create one parent row and one active identity per
parent, plus one independent evidence row for each of 31,766 selected source
printing candidates.

Use `yugioh_eng_parent` and `gundam_eng_parent` as explicit parent-grain
domains. Omit generated `number_plain` from the insert, model its database
expression for readback, and preserve the complete printed collector number in
`printed_identity_modifier`. This makes all 26,719 standard-set coordinates
unique without inventing a variant.

Execute the candidate only inside an exact-SHA production transaction that is
owned by the proof runner and always ends with `ROLLBACK`.

## Alternatives Rejected

- One parent per source rarity was rejected because rarity is printing
  evidence, not parent identity.
- `variant_key` was rejected as a collision workaround because no variant
  authority exists.
- Writing `number_plain` was rejected because production defines it as an
  always-generated column.
- Omitting lettered collector-number distinctions was rejected because it
  collapses lawful source coordinates.
- Including the 1,116 review-required parents was rejected because the gate
  cannot resolve identity or artwork ambiguity.
- A durable migration was rejected before full rollback proof.

## Failed-Closed Repair

Run `33255291975` reached the first insert and PostgreSQL rejected the explicit
generated-column value. The runner attempted and completed rollback, then
proved unchanged production state. No row or migration entry persisted.

The repair removed `number_plain` from the insert, reproduced the generation
rule in the expected readback, and added full printed collector-number
modifiers. A regression contract now covers this failure class and all 891
previously colliding generated-coordinate groups.

## Production Proof

- implementation PR: `322`;
- narrow repair PR: `325`;
- producer SHA: `de0df6e52154c700054621e30adf55799cfac95f`;
- workflow run: `33255537521`;
- artifact ID: `9715725035`;
- payload fingerprint:
  `8f100ff767f0aedb309c25774e1860f5035a9500ed379235d81ed46cd66ee094`;
- transient `card_prints`: `26,719`;
- transient active identities: `26,719`;
- transient source-evidence rows: `31,766`;
- card payload hash: expected equals actual;
- identity payload hash: expected equals actual;
- evidence payload hash: expected equals actual;
- attributable insert tables: exactly three;
- attributable updates/deletes: `0`;
- anon-visible target cards: `0`;
- authenticated-visible target cards: `0`;
- migration versions unchanged: `true`;
- rollback attempted and succeeded: `true`;
- preflight and post-rollback evidence SHA-256: identical;
- reconciliation mismatches: `0`;
- durable database writes: `0`.

## Current Truths

1. A deterministic durable payload candidate exists for all 26,719
   proposal-ready parent cards.
2. Production still contains zero cards in the 505 target sets.
3. Production does not yet contain the two parent identity domains.
4. Yu-Gi-Oh and Gundam remain hidden from both app roles.
5. The 1,116 review-required parents remain excluded.
6. No child printing, mapping, image, pricing, publication, search, or Vault
   authority was created.
7. Compact proof, provenance, and hashes are permanently preserved in this
   repository. The full migration, payloads, readbacks, and rollback contract
   remain in workflow artifact `9715725035`, which has a 90-day retention
   period and is not a permanent executable checkpoint.

## Invariants

- Parent identity remains separate from source printing evidence.
- Source rarity never becomes finish or variant without separate authority.
- Full printed collector-number distinctions must survive generated-field
  normalization.
- Review-required rows cannot enter a durable apply.
- Hidden release controls cannot change in an identity apply.
- Durable apply must use the exact payload fingerprint and migration hash
  proven here.
- No child printing, mapping, image, price, public visibility, or Vault write
  may piggyback on the parent apply.

## Exact Next Gate

Prepare a separately authorized durable apply of the exact candidate migration
from producer SHA `de0df6e52154c700054621e30adf55799cfac95f`, payload fingerprint
`8f100ff767f0aedb309c25774e1860f5035a9500ed379235d81ed46cd66ee094`, and
migration candidate SHA-256
`5070d8738a2479aa0703488939b79bd488718800d3464e8e0ca9a99f5824ae4b`.

Before authorization or database access, the durable runner must either:

1. retrieve workflow artifact `9715725035` before its 90-day expiry and verify
   every file against `remote_artifact_hashes.json`; or
2. regenerate the candidate from the frozen producer SHA and inputs, then prove
   that the payload fingerprint and every expected file hash are identical.

If neither condition holds, the durable apply must stop. Hashes alone do not
authorize or reconstruct the executable candidate.

The durable gate must re-run fresh collision and hidden-control preflight,
apply exactly 26,719 parents, 26,719 identities, and 31,766 evidence rows in one
transaction, write exactly one migration-ledger entry, read every count and
payload hash back, and prove both app roles still see zero cards.

Stop before the 1,116 review rows, 43-row parser delta, child printings,
external mappings, images, prices, search, publication, or application
visibility.
