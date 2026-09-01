# TK-SM-R Phone-To-Executor Automation V1

## Status

`LOCKED`

The founder phone decision, source-specific command execution, exact durable
readback, and scheduled idle dispatcher proof are complete. This checkpoint does
not declare TK-SM-R print enrichment or app publication complete.

## Context

TK-SM-R was used as the first bounded proof that a founder can approve an exact
catalog work item from the phone without giving the client database-writer
authority. The approved command applied only the reviewed 11-row parent delta.
The remaining manual GitHub dispatch step was then replaced with a scheduled,
code-reviewed command dispatcher.

## Problem

The phone approval path created a frozen queued command, but an operator still
had to start its source-specific GitHub workflow. That manual link did not scale
to the number of background catalog agents Grookai expects to operate.

## Risk

A generic dispatcher could turn phone approval into arbitrary production code
execution, execute code from an unreviewed branch, duplicate a canonical write,
or allow a scheduled run to replace a pending manual fallback.

## Decision

- Keep the phone and database command payload non-executable.
- Register action-to-executor mappings only in reviewed source code.
- Resolve commands through a private read-only RPC.
- Restrict automatic dispatch to `main`.
- Check out the command's frozen source commit before execution.
- Let only the source-specific executor lease the exact command.
- Use the atomic database lease as the exactly-once boundary.
- Keep manual and scheduled GitHub concurrency groups separate so schedule
  ticks cannot replace pending manual fallback runs.
- Require exact durable readback before command completion.

## Alternatives Rejected

- Dynamic script paths, shell commands, SQL, URLs, or executor arguments from a
  founder work item or database row.
- Direct writer access from the mobile client.
- Automatic approval of review-only work items.
- Running production dispatch logic from a manually selected non-main ref.
- A shared GitHub concurrency group for manual and scheduled execution; GitHub
  may replace an older pending member even when `cancel-in-progress` is false.
- Treating GitHub concurrency as the durable exactly-once authority.

## Applied Catalog Scope

The previously approved command applied exactly:

- 11 parent `card_prints`
- 11 active `card_print_identity` rows
- 22 active `card_print_identity_source_evidence` rows
- 11 active `card_print_family_review_queue` rows

The applied 11-row scope contains:

- 0 child printings
- 0 external mappings
- 0 Vault rows
- 0 image-pointer rows

The applied scope's persistence fingerprint is:

`d4b22b625cd753bb17d47e76c07b3508a55811871f8eaafcb8cedfb855e2ec37`

No migration was applied as part of the dispatcher implementation or its live
idle proof.

## Phone And Command Proof

- Work item: `68e8e48b-babc-42eb-b234-92131de1e185`
- Command: `39fc4f45-ba76-497e-a88f-1d383e2a766f`
- Action: `apply_tk_sm_r_hidden_set_v1`
- Executor: `TK_SM_R_HIDDEN_SET_APPLY_EXECUTOR_V1`
- Frozen writer source: `8bc32559f318442798c1f5931f570abab83d3467`
- Plan fingerprint:
  `19b9d6bd2cb94112598a18c5ca16092524e2aeb8d6b74ed5715d4764d157f485`
- Apply workflow run:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33492557093`
- Command status: `succeeded`
- Command attempts: `1`
- Execution path: `fresh_apply`
- Durable reconciliation: `true`

## Dispatcher Implementation

- Pull request:
  `https://github.com/OriginalSoseji/grookai_vault/pull/360`
- Merged main commit:
  `beaf973fa1a3a82501f565d5e8894d1a9ef374e1`
- Dispatcher version: `FOUNDER_COMMAND_DISPATCHER_V1`
- Registered actions: `1`
- Registered V1 action: `apply_tk_sm_r_hidden_set_v1`
- Polling schedule: existing operations maintenance cycle, every 15 minutes

The implementation addressed two review findings before merge:

1. Production dispatch is restricted to `main`.
2. Manual and scheduled workflows use separate concurrency groups while the
   database command lease remains authoritative.

## Scheduled Idle Proof

- Workflow run:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33499374401`
- Producer commit:
  `beaf973fa1a3a82501f565d5e8894d1a9ef374e1`
- Maintenance job: `success`
- Dispatcher job: `success`
- Dispatcher status: `idle`
- Command found: `false`
- Canonical writes: `false`
- Frozen executor checkout: skipped
- Dependency installation: skipped
- Executor invocation: skipped
- Command evidence upload: skipped because the cycle was an idle success

Independent post-run readback proved:

- the exact 11-row persistence fingerprint remained unchanged;
- the original command still had exactly one attempt;
- no registered TK-SM-R command remained queued;
- forbidden surfaces for the applied 11-row scope remained zero.

## Verification

- Targeted operations/TK-SM-R contracts: `44/44` passed after the final
  concurrency repair.
- Node syntax checks: passed.
- `git diff --check`: passed.
- Full repository shipcheck on the exact repair commit: passed, including 646
  Flutter tests.
- GitHub CodeQL, contract drift, runtime protection, legacy-key guard, and
  Vercel checks: passed.
- Two later local pre-push full-suite retries each encountered a different
  transient Flutter test-file load failure. Both named files passed immediately
  when run independently. No Flutter source was changed in this workstream.

GitHub Actions emitted a non-blocking notice that `actions/checkout@v4`,
`actions/setup-node@v4`, and `actions/upload-artifact@v4` target deprecated Node
20 action runtimes and are currently forced onto Node 24 by the runner. This is
maintenance debt, not a failure of the dispatcher proof.

## Current Whole-Set Truth

The set row is `SM Trainer Kit (Alolan Raichu)`, code `tk-sm-r`, ID
`63e87275-5795-4ed0-918b-fbf62e5457ce`.

Whole-set production readback:

- 30 parent card prints
- 30 active identities
- 22 active source-evidence rows
- 11 active family-review rows
- 19 parent image pointers
- 19 child printings
- 57 external mappings
- 0 Vault rows
- no set-specific release-control row
- no set hero image

The 19 parents that existed before the 11-row apply are not missing work to be
recreated. Earlier shorthand suggesting that 19 parents remained to be added was
incorrect. Parent identity acquisition is complete at 30/30.

All 11 newly applied family-review rows are:

- `review_status = pending`
- `family_status = resolved_non_species_identity`
- `family_link_promotion_allowed = false`

The whole-set counts for child printings, mappings, and image pointers are not
zero because the older 19 rows already had those surfaces. The zero counts in
the apply proof refer only to the new 11-row command scope.

## Invariants

- Founder clients approve frozen plans; they do not execute writers.
- Work items and database rows cannot register or select arbitrary executors.
- Automatic production dispatch runs only from reviewed `main` code.
- Executors lease one exact action, executor version, command ID, source SHA,
  plan fingerprint, and deadline.
- A second executor racing for the same command must receive no lease and make
  no canonical write.
- No command is successful without independent exact durable readback.
- Existing exact rows are reconciled, not blindly rewritten.
- The 11-row apply boundary must not silently expand into child printing,
  mapping, image, Vault, pricing, or publication writes.
- The existing 19 rows must not be recreated or remapped merely because they
  were outside the 11-row apply scope.

## What Must Never Be Broken

- No arbitrary command execution from phone or database content.
- No production dispatch from feature branches.
- No duplicate apply caused by scheduled/manual races.
- No interpretation of `not written in this apply` as `absent from the set`.
- No family-link promotion for the 11 pending non-species reviews without a
  separate reviewed decision.
- No invented exact finish, printing, image, mapping, or publication evidence.

## Remaining Non-Launch-Critical Work

1. Resolve the 11 pending non-species family reviews, preserving no-link status
   unless independent evidence proves a family relationship.
2. Acquire and self-host exact image evidence for the 11 parent-only rows.
3. Propose child printings only where exact finish/variant evidence exists.
4. Propose exact external mappings for those child printings; do not inherit the
   older 19 rows' mappings by similarity.
5. Reconcile set metadata, including release date, cover art, and whether this
   Trainer Kit needs a dedicated set release-control row.
6. Run signed-in search, set-browser, card-detail, and image smoke tests after a
   separately approved enrichment apply.
7. Upgrade deprecated GitHub action major versions in a separate maintenance PR
   after repository compatibility review.

## Explicit Next Gate

When TK-SM-R work resumes, create a read-only 11-row enrichment proposal that
contains self-hosted image candidates, family-review dispositions, and any
provable exact child-printing/mapping candidates. Freeze its IDs and hashes,
verify it introduces no duplicate of the existing 19 rows, and stop before any
database, Storage, pointer, mapping, publication, pricing, or Vault write.

