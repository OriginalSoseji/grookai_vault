# Pricing Checkpoint 51: MTG MSH Canonical Promotion Rollback Proven

## Status

The set-generic hidden canonical promotion path has been implemented and proven
against the frozen Marvel Super Heroes (`msh`) service-only staging batch.

The proof inserted every planned MSH canonical row inside one production
transaction, read every row back exactly, verified the hidden client boundary,
and rolled the complete transaction back. A separate read-only process then
verified that production returned to the exact preflight baseline.

MSH is not durably canonical, visible, priced, imaged, or available to the app.

## Producing Code

- branch: `agent/mtg-pricing-readiness-v1`;
- frozen producing commit:
  `87deda5c74b160e68fae50ade484bf722adc40e2`;
- tracked worktree before both production proofs: clean;
- set promotion contract:
  `MTG_CANONICAL_CATALOG_SET_PROMOTION_CONTRACT_V1`;
- source payload version: `MTG_CANONICAL_CATALOG_SET_BATCH_V1`.

The original DSK first-import writer remains unchanged. The generalized path
does not create migrations, seed a game, alter release control, or assume an
empty MTG catalog.

## Frozen MSH Contract

- source payload fingerprint:
  `73d0b68c08ff462cc2f853520faa491a73d9d7e27db9c93afcc95bfc06c00e38`;
- immutable staging batch:
  `276cc9f7-0159-5df3-874c-73ea04e741a4`;
- staged rows SHA-256:
  `788eaf7637311ce021f531d70430f05700594eb03fd48a0c00bd8e0e4b7f0e6c`;
- canonical promotion rows SHA-256:
  `2b3cb12453146bea1bf9adfe793ad8f62d237bb720f3946e4603d028a19b275e`;
- promotion plan SHA-256:
  `b6d2e6e0af04948fbb27e73deb4cbb6dc39d55a9bc0b7e0709f3b551b3a778ba`.

Exact transactional inserts:

- 1 set;
- 453 parent `card_prints`;
- 453 `card_print_identity` rows;
- 865 finish-specific `card_printings`;
- 453 Scryfall parent mappings;
- 864 exact TCGPlayer printing mappings;
- 3,089 total rows.

## Transaction Proof

Before the insert transaction:

- MTG release status: `hidden`;
- canonical MTG sets: 1;
- canonical MTG parents: 417;
- canonical MTG identities: 417;
- canonical MTG printings: 807;
- canonical MSH rows: 0;
- DSK parents: 417;
- DSK printings: 807;
- service-visible Pokemon parents: 58,769;
- authenticated-visible Pokemon parents: 58,768;
- MSH immutable staging rows: 3,089.

Inside the transaction:

- all six insert counts matched the frozen plan;
- all six exact readbacks matched every planned field;
- canonical MTG parents became 870;
- canonical MTG identities became 870;
- canonical MTG printings became 1,672;
- exact MSH parent/identity/printing counts were 453/453/865;
- exact MSH Scryfall/TCGPlayer mapping counts were 453/864;
- DSK remained 417 parents and 807 printings;
- MTG release remained `hidden`;
- anonymous and authenticated MTG catalog/search counts remained 0;
- Pokemon service and authenticated counts remained unchanged.

After rollback:

- the complete state object matched the preflight state exactly;
- canonical MTG returned to 1 set, 417 parents, 417 identities, and 807
  printings;
- canonical MSH returned to 0 rows in every planned table;
- the immutable MSH staging batch remained present at exactly 3,089 rows;
- its independent readback hash remained
  `788eaf7637311ce021f531d70430f05700594eb03fd48a0c00bd8e0e4b7f0e6c`;
- no migration, release-control, image, Storage, pricing, publication, Vault,
  or Pokemon write survived.

## Independent Verification

The independent verifier used a new read-only transaction and did not share the
promotion transaction. It reconciled the frozen staging rows, compared live
production with both the preflight and post-rollback states in the proof,
rechecked collision absence, exercised both client roles, and reported zero
findings.

Permanent evidence:

- transactional rollback proof:
  `docs/audits/pricing/mtg_canonical_catalog_set_promotion_rollback_proof_v1/2026-08-13T22-57-44Z/`;
- independent post-rollback readback:
  `docs/audits/pricing/mtg_canonical_catalog_set_promotion_post_rollback_readback_v1/2026-08-13T22-58-45Z/`.

Both directories contain `summary.json`, `REPORT.md`, and SHA-256 artifact
manifests. The rollback proof also preserves the exact public promotion plan.

## Tests

- all MTG contract tests: 67/67 passed;
- Node syntax checks passed for the three new audit modules and contract test;
- `git diff --check` passed;
- full repository pre-commit shipcheck passed;
- full repository pre-push shipcheck passed;
- Flutter test result in each shipcheck: 614 passed.

The repository preflight continues to report only the already-governed deferred
debt; critical failure count remains zero.

## Invariants

- Immutable staging is the only source authorized by this promotion plan.
- Promotion is insert-only and collision-free.
- Existing canonical rows cannot be updated or deleted by the contract.
- MTG must remain hidden before, during, and after the bounded apply.
- DSK must remain unchanged.
- MSH image pointers remain null; no external image URL is published.
- Pricing evidence is mapped but not published by canonical promotion.
- Pokemon data, pricing, visibility, and Vault ownership remain outside scope.
- No additional set may be bundled into the MSH apply.

## Exact Next Gate

Build a fail-closed, set-generic durable promotion writer for the exact MSH plan
above. The writer must require an exact approval string, confirm the frozen
commit and clean tracked worktree, rerun all preconditions, insert only the
3,089 planned MSH rows, commit once, and perform an independent read-only
post-apply reconciliation.

Before durable apply, run the writer in rollback mode and prove that its apply
path preserves this same plan and boundary. Do not durably promote MSH, process
another set, self-host images, update image pointers, publish prices, activate
MTG visibility, or write Vault data until that writer dry-run is separately
checkpointed.
