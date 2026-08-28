# Collectible Wave 1 Set Apply Proposal V1

## Status

`PRODUCTION READ-ONLY / NO WRITE AUTHORITY`

## Objective

Convert exactly the 505 `review_ready` rows from the frozen Wave 1 set
foundation artifact into a deterministic canonical set payload, then prove in
a repeatable-read production transaction that the payload owns no existing set
ID, code, source proposal, or same-game name.

This gate does not generate, register, or execute a migration. It does not
create canonical sets. It produces the exact payload and rollback selectors
needed for a later migration and rollback-only proof.

## Frozen Input

- workflow run: `33142767700`;
- artifact ID: `9674581333`;
- artifact name:
  `collectible-wave1-set-foundation-proposal-33142767700`;
- producer SHA: `843f73d33427d54aa98ab3248f097498f5cce2ef`;
- `set_candidates.jsonl`: 878,931 bytes, SHA-256
  `382e1a26fc2e3c57766445949c9fc0f0051544eb4f552c88bcf2654bddc320bb`;
- `summary.json`: 1,888 bytes, SHA-256
  `40dc7eea7964b4a04547ea0c851cd2adfa82fec2de44778732e7af352bec4fbc`;
- empty `validation_failures.jsonl`: SHA-256
  `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

All three files and their upstream hash-manifest records must match before a
database connection opens.

## Selection Boundary

The payload contains exactly:

- 500 Yu-Gi-Oh sets;
- 5 Gundam Card Game sets;
- 505 total sets;
- English candidate evidence only;
- rows whose exact source status is `review_ready`, with no reason codes and no
  review requirement.

The other 551 source rows remain excluded and are preserved in
`excluded_review_rows.jsonl`. Shared source codes, language-marker conflicts,
candidate-name conflicts, and source gaps cannot enter the payload.

## Canonical Identity Policy

Set IDs are UUIDv5 values generated from the frozen source `set_proposal_id`
under namespace `f6ba1fa1-e377-59a1-995a-58323b4d46f5`.

Canonical codes are globally namespaced because production has a global unique
index on `public.sets.code`:

- Yu-Gi-Oh: `ygo-<lowercase source set code>`;
- Gundam: `gcg-<lowercase source set code>`.

The exact source code remains in `printed_set_abbrev` and in the source evidence
object. Namespaced canonical codes do not rewrite or merge source identities.

## Set Payload Policy

Every proposed row contains only:

- deterministic set ID;
- game code;
- namespaced canonical code;
- exact manifest name;
- exact manifest release date when supplied;
- structured source-manifest evidence;
- exact source set abbreviation;
- `identity_model = standard`;
- null image fields;
- null `printed_total` and `set_role` where the source does not prove their
  canonical meaning;
- null `identity_domain_default` because this gate does not authorize card
  identity domains.

Source card counts remain evidence inside `source`; they are not promoted to
`printed_total`. No source URL, raw manifest body, or image pointer is stored.

## Production Preflight

The worker must:

1. require the exact clean producer commit;
2. write `run_plan.json` before opening the database connection;
3. force `default_transaction_read_only=on`;
4. begin a repeatable-read, read-only transaction;
5. verify migration history is exactly at `20260828024500`;
6. verify the two exact game rows and hidden release controls;
7. verify the required `public.sets` columns and uniqueness boundaries;
8. prove production contains zero Yu-Gi-Oh/Gundam set rows;
9. prove zero planned ID, global code, source-proposal, and same-game name
   collisions;
10. end with `ROLLBACK` and close the connection.

## Rollback Design

The candidate rollback selector contains all 505 exact set IDs and codes plus a
payload fingerprint. It is not executable and has no automatic authority.

A future rollback may delete only exact rows inserted by the authorized
migration and only while none has acquired card, image, pricing, publication,
or Vault dependencies. If any selected set has downstream references, the
system must use a forward fix instead of destructive rollback.

## Required Artifacts

- `run_plan.json`;
- `set_apply_payload.jsonl`;
- `excluded_review_rows.jsonl`;
- `database_preflight.json`;
- `rollback_contract.json`;
- `summary.json`;
- `validation_failures.jsonl`;
- `REPORT.md`;
- `artifact_hashes.json`.

## Invariants

- No database mutation statement exists in the worker.
- No migration file is generated or registered.
- No selected row has write authority in this gate.
- Every proposed code and UUID is unique and deterministic.
- All selected rows remain hidden under the existing game release controls.
- No card, identity, printing, mapping, Storage, image, pricing, publication,
  or Vault write occurs.
- The 551 excluded rows remain outside every future migration built from this
  payload unless separately resolved and reviewed.

## Stop Condition

Stop after the exact production read-only proposal and artifact reconciliation.
Do not create a migration and do not execute a rollback-only or durable apply.

The next gate is a separately reviewed migration candidate for these exact 505
rows, followed by a production rollback-only proof. Durable apply requires a
new authorization naming the exact migration SHA, payload fingerprint, run-plan
fingerprint, row counts, and rollback proof.
