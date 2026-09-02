# Repository Reconciliation Decision Ledger

This ledger records source-to-destination decisions made after the immutable
preservation package was proven restorable. It is not branch deletion authority.

## Decision Rules

- Preserve current production behavior when it supersedes stale source behavior.
- Migrate capabilities, not branch histories.
- Do not merge a stale branch wholesale.
- Keep migrations unapplied until their domain review and mutation gate pass.
- Record every accepted, superseded, deferred, or rejected source with evidence.

## Wave 1: Lot Sharing And Pricing

| Field | Value |
| --- | --- |
| Source | `fix/lot-sharing-pricing-main-v1` |
| Source SHA | `91e4c043f076a71721cd95c27715c3737eba78ed` |
| Original commits | `c1eb2e93a`, `91e4c043f` |
| Disposition | `superseded_by_main` |
| Destination authority | `3b2f86462a0ff593f76b95b76a883ca12808ce08` (PR #230) |
| Application changes migrated | None |
| Reason | PR #230 squash-merged both lot commits and added a newer printing-identity correction. Original commit SHAs are not ancestors of main, which caused the initial ancestry-only ledger to classify the branch as divergent. Behavioral and path comparison proved the source capability is already present. |
| Safety proof | A trial replay produced only stale deltas and was neutralized with a forward revert on the non-production candidate. No production branch or deployment was changed. |
| Verification | Four authoritative Flutter test files, 30 tests passed. |

The source branch and its recovery refs remain preserved. This decision does not
authorize deleting the source branch or worktree.

## Wave 2: MTG Catalog Supervisor Batch Bound

| Field | Value |
| --- | --- |
| Source | `C:\grookai_vault_mtg_supervisor_batch_size` |
| Source SHA | `5b4a95e637ffcfb214aeeeb7b2279751124ab9f4` plus two dirty tracked paths |
| Disposition | `migrated` |
| Destination | `integration/reconciled-main-v1` |
| Migrated paths | `.github/workflows/mtg-catalog-supervisor.yml`; `tests/contracts/mtg_catalog_supervisor_v1.test.mjs` |
| Behavior | Bound a supervisor dispatch to 25 sets and document the six-hour GitHub runner constraint. |
| Excluded behavior | No catalog run, production write, workflow dispatch, or source worktree mutation. |

The source dirty state remains byte-preserved in the recovery package and unchanged
in its original worktree.

## Wave 3: Governed MTG Sealed World

| Field | Value |
| --- | --- |
| Source | PR #219, `agent/mtg-sealed-world-v1` |
| Source SHA | `a0d1f1123eca9335d379c49d00f055c46adb87c6` |
| Original commits | `69f09f8eb`, `a0d1f1123` |
| Disposition | `migrated_unapplied` |
| Destination commits | `87a426fad`, `b5816eb6e` |
| Capability | Per-game sealed release pointer, exact English MTG sealed-world planner/operator, frozen workflow, contract and tests. |
| Migration | `20260816170000_sealed_product_per_game_release_v2.sql` is present but not applied. Its timestamp is unique, and no later migration on current main modifies the sealed release tables. |
| Production boundary | No database query, migration apply, release activation, workflow dispatch, deployment, or product visibility change occurred. |
| Verification | Node syntax checks passed; 13 focused contracts passed; diff check passed. |

PR #219 and its branch remain preserved. The old PR must not be merged after the
reconciled replacement is accepted because that would duplicate an already-migrated
capability.

## Wave 4: Chat Safety And Founder Review

| Field | Value |
| --- | --- |
| Source | Dirty worktree `C:\grookai_vault_launch_closeout` |
| Source base SHA | `5b4a95e637ffcfb214aeeeb7b2279751124ab9f4` |
| Disposition | `migrated_by_domain` |
| Capability | Versioned web and Flutter message screening, collector report reasons, founder-only report review, user guidance, privacy and store disclosure. |
| Evidence boundary | Client and web-server enforcement only. No database trigger, migration, report deletion, message rewrite, account action, or production deployment. |
| Verification | 6 Node tests passed; 3 Flutter tests passed; web TypeScript passed; targeted Flutter analysis passed; targeted ESLint passed. |

The original dirty worktree remains unchanged and its complete state remains in the
preservation package. Only the chat-safety domain paths were migrated in this wave.

## Wave 5: Unified Collector Search UX

| Field | Value |
| --- | --- |
| Source | Dirty worktree `C:\grookai_vault_launch_closeout` plus preserved source commit `893119c8c` |
| Source base SHA | `5b4a95e637ffcfb214aeeeb7b2279751124ab9f4` |
| Disposition | `migrated_by_domain` |
| Capability | One governed TCG scope selector, exact-card web suggestions, Pokemon/One Piece/MTG search scopes, and signed-out Pokemon catalog fallback. |
| Reconciliation | Preserved current-main smart-search and exact-printing behavior; removed duplicate game and preset controls; repaired the mobile resolver call for the current client contract. |
| Excluded behavior | No search-index write, database mutation, catalog release change, feature-flag activation, deployment, or production traffic change. |
| Verification | 8 Node search contracts passed; compact Explore subtest passed; 7 Flutter search/fallback tests passed; web TypeScript and targeted ESLint passed; targeted Flutter analysis passed. |

The source worktree remains unchanged. The candidate contains a capability-level
reconciliation rather than the stale source branch history.

## Wave 6: Vault Bulk Selection And Archive

| Field | Value |
| --- | --- |
| Source | Dirty worktree `C:\grookai_vault_launch_closeout` |
| Source base SHA | `5b4a95e637ffcfb214aeeeb7b2279751124ab9f4` |
| Disposition | `superseded_by_main` |
| Capability | Explicit Vault selection mode, priced/unpriced filtering, select-all, lot pricing, and authenticated atomic archive. |
| Main evidence | The service and migration are byte-identical to the source. Current main contains the complete UI capability plus a newer empty-filter recovery path and contract. |
| Application changes migrated | None; replaying the source UI/test would remove the newer empty-state behavior. |
| Production boundary | No Vault rows, database objects, user collections, deployments, or production configuration changed. |
| Verification | 4 Node contracts passed; Flutter Vault multi-select contract passed; targeted Flutter analysis passed. |

The source dirty state remains preserved and unchanged. The migration already on
main was not applied or otherwise executed during reconciliation.

## Wave 7: Operator Playbook And Store Readiness

| Field | Value |
| --- | --- |
| Source | Dirty worktree `C:\grookai_vault_launch_closeout` |
| Source base SHA | `5b4a95e637ffcfb214aeeeb7b2279751124ab9f4` |
| Disposition | `migrated_as_governance_and_historical_evidence` |
| Capability | Durable operator entry point, living playbook, cross-store metadata contract, readiness evaluator, media generator, native Android onboarding QA, and dated audit/checkpoint evidence. |
| Reconciliation | Preserved current build-311 Apple metadata. Imported Google metadata and dated console observations without presenting them as current console truth. |
| Current gate | Repository contract is valid; submission is blocked by six absent current media assets and unverified Apple/Google console state. |
| Excluded behavior | No media fabrication, temporary account creation, console submission, store upload, deployment, database write, or external account mutation. |
| Verification | 3 store contracts passed; 3 scripts passed syntax checks; readiness status reports build 311 with zero contract findings and explicit external/media blockers. |

Historical status artifacts remain dated and immutable. Fresh console readback is
required before any release-readiness claim.

## Wave 8: Pricing Trust And Production Catalog Crawl

| Field | Value |
| --- | --- |
| Source | Dirty worktree `C:\grookai_vault_launch_closeout` |
| Source base SHA | `5b4a95e637ffcfb214aeeeb7b2279751124ab9f4` |
| Disposition | `migrated_and_forward_reconciled` |
| Capability | Evidence-chain pricing spot checks and a disposable-account production catalog crawl with verified cleanup and read-only catalog SQL. |
| Forward reconciliation | Expanded the preserved two-game crawl to the governed Pokemon, One Piece, and MTG scopes; 13 routes now cover search, sets, card detail, Vault, Binders, Wall, and Pulse. |
| Excluded behavior | No live crawl, temporary account creation, database connection, price publication, app-data write, deployment, or production mutation. |
| Verification | 3 pricing-policy contracts and 2 catalog-crawl contracts passed; all 3 modules passed syntax checks; diff check passed. |

The live commands remain explicit operator actions requiring deployment identity and
runtime credentials. Reconciliation did not execute them.

## Wave 9: Social Media Emulator Agents

| Field | Value |
| --- | --- |
| Source | Dirty worktree `C:\grookai_vault_launch_closeout` |
| Source base SHA | `5b4a95e637ffcfb214aeeeb7b2279751124ab9f4` |
| Disposition | `migrated_as_bounded_draft_tooling` |
| Capability | Validated Android emulator scenarios, semantic UI control, raw vertical recording, hashes, evidence artifacts, and a signed-out Charizard canary. |
| Safety boundary | Publishing is disabled; social credentials, account login, customer data, app-data writes, and automated posting are outside the action vocabulary. |
| Execution | No emulator scenario or recording was run during reconciliation. |
| Verification | 4 policy contracts passed; policy and agent modules passed syntax checks; diff check passed. |

Every recording remains a human-reviewed draft artifact. This wave does not grant
publication authority.
