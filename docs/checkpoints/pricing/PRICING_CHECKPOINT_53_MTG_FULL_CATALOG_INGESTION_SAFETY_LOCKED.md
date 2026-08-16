# Pricing Checkpoint 53: MTG Full Catalog Ingestion Safety Locked

## Status

The MTG full-catalog ingestion safety layer is implemented, frozen, and
production rollback-proven. It replaces the prior one-set-at-a-time approval
workflow with one manifest-level authorization for the complete frozen
catalog.

The executor may resume after interruption and retry bounded transient
failures without another per-set approval. Structural drift, reconciliation
failure, duplicate identity, scope expansion, or boundary failure stops the
executor before the next set.

No full-catalog durable ingestion occurred during this checkpoint. Production
remains DSK-only, MTG remains hidden, and every 25-set canary transaction was
rolled back.

## Frozen Code And Source

- branch: `agent/mtg-pricing-readiness-v1`;
- ingestion implementation commit:
  `7cf8f02d347cee73def3d3cb9732fa805be60994`;
- deployed-schema verifier repair commit:
  `ef62f433e89d690f55501e582c817fc427c6edfb`;
- final future-release policy commit:
  `7867a25905c72efec65c30b12eee9caf76d96f98`;
- governing files SHA-256:
  `3eba8eb8700c3459e2a73bd6a72cfbcf405ce9bda7c95e38aded67e5e34555bd`;
- frozen manifest SHA-256:
  `1240b4ab9aa71c118d022d23e393e8c06397346c61d778e223d0b3b549f8c3e1`;
- payload inventory SHA-256:
  `15028fc75a2d0dbfe56e494f07cfcf97c43994f475dcb73e416bdf88e287b5f4`;
- envelope SHA-256:
  `caeba0d49ea1fe81e4db045fb0c7f050abc3e25ac22b1f72cd4d9f3d209d24c6`.

The frozen plan is preserved at:

`docs/audits/pricing/mtg_canonical_catalog_ingestion_v1/2026-08-14T00-47-08Z_frozen_plan/`

## Frozen Catalog Scope

- source sets: `953`;
- already canonical: `1` DSK set, `417` parents, `807` printings;
- remaining authorized sets: `952`;
- remaining parent `card_prints`: `104,295`;
- remaining `card_print_identity` rows: `104,295`;
- remaining `card_printings`: `157,455`;
- remaining Scryfall parent mappings: `104,295`;
- remaining exact TCGPlayer printing mappings: `143,655`;
- maximum staged plus canonical row operations: `1,229,894`.

Ten future-dated sets are outside the current execution population and are
deferred before any database access. Set-level release-date abstention does not
erase preserved card-level release evidence and does not force invented dates.

The catalog also preserves these truthful gaps:

- `175` sets have no exact TCGPlayer printing mapping;
- `15` sets contain quarantined ambiguous mapping lanes;
- `42` candidate-to-source lane assignments remain withheld because their
  evidence is ambiguous.

Ingestion does not fabricate mappings to improve coverage.

## Safety Architecture

The manifest-level envelope and orchestrator provide:

- one exact catalog authorization instead of 952 set approvals;
- deterministic execution order;
- MSH as the first additive proof;
- a 25-set safety ramp spanning all 22 observed set types;
- one isolated staging transaction and one isolated canonical transaction per
  set;
- independent read-only post-commit reconciliation on a separate connection;
- database-authoritative resume classification;
- bounded transient retries, defaulting to three;
- an advisory lock preventing concurrent executors;
- progress artifacts after every state transition;
- automatic global safety gates after set 1, set 25, and the final eligible
  set;
- stop-before-next-set behavior for every structural failure.

Resume classifies each set as exactly one of:

- `absent`;
- `staged_exact`;
- `complete_exact`;
- `partial_or_drifted`.

Only exact states can advance automatically. A partial or drifted state stops
the run for repair; it is never guessed through.

## Mutation Boundary

The envelope permits only frozen staging and insert-only canonical catalog
rows. It does not authorize:

- migrations;
- release-control changes;
- signed-in or public MTG visibility;
- images, Storage, or image-pointer writes;
- pricing qualification or publication;
- Vault writes;
- Pokemon mutation;
- updates, deletes, truncates, cleanup, or payload substitution;
- rows outside the frozen manifest and payload inventory.

MTG must remain `hidden` before, during, and after ingestion.

## Failed-Closed Schema Proof

The first two-set rollback canary stopped on PostgreSQL error `42703` because
the verifier referenced a nonexistent deployed column,
`card_prints.image_source_ref`.

- completed sets: `0`;
- retries: `0`;
- durable mutations: `0`;
- behavior: stopped before the next set.

The verifier was narrowed to the actual deployed parent and printing image
columns, a regression test was added, and the identical two-set canary was run
again. The failed artifact remains permanent evidence that structural drift
fails closed.

Failed run:

`docs/audits/pricing/mtg_canonical_catalog_ingestion_v1/2026-08-14T00-38-13Z_two_set_rollback_canary/`

## Two-Set Rollback Proof

The repaired runner exercised MSH and `oe01` through full staging and canonical
insertion transactions, then rolled both back.

- selected: `2`;
- completed: `2`;
- failed: `0`;
- retries: `0`;
- durable applied counts: all zero;
- findings: `0`.

After both transactions, production remained DSK-only at 417 parents and 807
printings, MTG client visibility remained zero, and Pokemon counts remained
unchanged.

Successful run:

`docs/audits/pricing/mtg_canonical_catalog_ingestion_v1/2026-08-14T00-41-00Z_two_set_rollback_canary/`

## Stratified 25-Set Rollback Proof

The final frozen runner processed 25 selected sets without changing code,
selection, prompts, or configuration during execution.

- selected: `25`;
- completed full-cycle rollbacks: `25`;
- failed: `0`;
- retries: `0`;
- findings: `0`;
- durable applied counts: all zero;
- observed set types covered: `22/22`;
- future-dated selected sets: `0`;
- automatic safety gates passed: set `1` and set `25`.

The sample included:

- MSH and an already staged set path;
- absent-set staging paths;
- small and large payloads;
- sets with zero exact printing mappings;
- a set-level release-date abstention;
- a quarantined ambiguous-mapping lane;
- every set type present in the frozen catalog.

Final production readback proved:

- canonical MTG sets: `1`;
- canonical MTG parents: `417`;
- canonical MTG identities: `417`;
- canonical MTG printings: `807`;
- release status: `hidden`;
- anonymous MTG client rows: `0`;
- authenticated MTG client rows: `0`;
- service-visible Pokemon parents: `58,769`;
- authenticated-visible Pokemon parents: `58,768`;
- staging rows: `5,955`;
- release and staging RLS/grants: unchanged and enforcing.

Run artifact:

`docs/audits/pricing/mtg_canonical_catalog_ingestion_v1/2026-08-14T00-47-31Z_stratified_25_rollback_canary/`

Key artifact hashes:

- `run_plan.json`:
  `6f1087d92df63f95390fd16294c9c1e5d0bb652507d1abb71bd259d8d6141ac2`;
- `progress.jsonl`:
  `f22a96017400911dcb7b38aefaf9d075f01a164661a970087c9f70ce545a5102`;
- `summary.json`:
  `88439be10cb5590d44dd56215d1d16a5d39f38643485088f7629bc23d8eab0c4`;
- `REPORT.md`:
  `ace26e96f89fc03794d47a34f920d4f16b6fbcb012f286c45f80bff33dad3bfb`.

## Verification

- all MTG contract tests: `91/91` passed;
- Node syntax checks passed for the envelope and orchestrator;
- `git diff --check` passed;
- the implementation commit passed the full repository shipcheck, including
  `614` Flutter tests and the web build, lint, and typecheck;
- the two narrow follow-up commits passed the full MTG contract suite;
- local and remote code SHAs reconciled before the final canary.

## Current Truths

- The ingestion safety system is complete for the frozen catalog.
- Per-set human approvals are no longer part of the execution design.
- The frozen payload inventory has been fully validated offline.
- The production transaction path is rollback-proven across the complete set
  type distribution.
- Full durable ingestion has not started.
- Production remains DSK-only and all MTG app visibility remains disabled.
- Images, pricing publication, Vault support, and client rollout remain later
  projects and are not implied by canonical ingestion.

## What Must Never Be Broken

- Canonical identity is insert-only inside this envelope.
- Ambiguous mappings remain quarantined.
- Missing price mappings remain honest gaps.
- Future sets never enter before their release date through this frozen run.
- A partial database state never resumes automatically.
- A provider, source, payload, code, hash, count, or security mismatch stops
  before the next set.
- MTG release status remains hidden until a separate rollout gate.
- Pokemon, pricing, images, Storage, and Vault remain outside this mutation
  authority.

## Exact Next Gate

One manifest-level authorization may start the durable hidden ingestion. That
single authorization covers all 952 remaining frozen sets, automatic resume,
and bounded transient retries; no per-set approvals are required.

The durable executor must:

1. process MSH first;
2. pass the automatic set-1 global gate;
3. continue through the same 25-set stratified safety ramp;
4. pass the automatic set-25 global gate;
5. continue through all eligible frozen sets without human pauses;
6. defer future-dated sets before database access;
7. stop before the next set on any structural mismatch;
8. finish with exact manifest reconciliation and the final global gate.

Do not activate MTG visibility, ingest images, publish pricing, write Vault
data, or mutate adjacent domains as part of that operation.
