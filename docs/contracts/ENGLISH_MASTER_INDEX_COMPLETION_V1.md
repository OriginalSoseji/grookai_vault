# ENGLISH_MASTER_INDEX_COMPLETION_V1

Status: Active
Date: 2026-05-25

## Purpose

`ENGLISH_MASTER_INDEX_COMPLETION_V1` defines the completion standard for Grookai's English physical Pokemon TCG Master Index.

The Master Index must be built before Grookai is reconciled against it.

This contract supersedes any workflow that treats an incomplete source-agreement index as write authority.

## Scope

In scope:

- English physical Pokemon TCG sets
- set registry and source aliases
- card identity truth
- card number truth
- card name truth
- printing and finish truth
- source availability
- source agreement
- source gaps
- conflict queues
- completion scoring
- master-admissible exports

Out of scope:

- Grookai DB reconciliation
- Supabase writes
- migrations
- cleanup
- quarantine apply
- pricing
- scanner behavior
- vault ownership mutation
- non-English cards
- Pokemon TCG Pocket unless explicitly scoped separately

## Core Rule

The Master Index is the source of truth target.

Grookai comparison happens only after a set or fact is admitted into the Master Index under this contract.

## Fact Classes

### Working Evidence

Working evidence is collected from source adapters and fixtures. It may be useful but is not automatically Master Index truth.

Examples:

- one structured API source
- two structured API sources
- one human/checklist source
- a marketplace listing
- a general finish rule

### Master-Admissible Card Identity

A card identity may enter the Master Index when:

```text
source_count >= 2
AND independent sources agree on:
  set + card_number + card_name
AND no unresolved conflict exists
AND language is English
AND product scope is English physical Pokemon TCG
```

Structured API agreement may admit card identity, but every source URL or source identifier must be preserved.

An exact Master-admissible printing/finish fact also admits the card identity it contains, because that fact already proves:

```text
set + card_number + card_name + finish_key
```

This derived admission must be reported separately as printing-derived card identity support.

### Master-Admissible Printing / Finish

A printing or finish may enter the Master Index only when:

```text
source_count >= 2
AND at least one source is official, human-readable, checklist-style, marketplace-checklist, or collector-reference
AND the evidence supports the exact fact:
  set + card_number + card_name + finish_key
AND no unresolved conflict exists
AND language is English
AND product scope is English physical Pokemon TCG
```

General finish rules do not prove exact card-level finish truth unless they can be mapped safely to exact card coverage and are retained as evidence.

## Statuses

Allowed completion statuses:

- `complete_master_index_set`
- `card_identity_complete_finish_incomplete`
- `source_agreed_card_identity`
- `source_limited`
- `finish_evidence_missing`
- `conflict_blocked`
- `manual_review_required`
- `source_unavailable`
- `out_of_scope`

Allowed fact statuses:

- `master_admissible`
- `working_api_agreed`
- `working_candidate`
- `human_supported_not_complete`
- `conflicting`
- `needs_manual_review`
- `source_unavailable`
- `out_of_scope`

## Reuse Rule

Existing `VERIFIED_MASTER_SET_INDEX_V1` outputs may be reused only as working evidence and pipeline scaffolding.

They must not be described as the completed Master Index unless this contract's completion gates are met.

Reusable pieces:

- source adapters
- source evidence rows
- source availability records
- card identity candidates
- printing finish candidates
- human fixture loader
- source agreement classifier

Non-reusable as Master Index authority:

- Grookai comparison reports
- write-readiness reports
- unsupported-by-current-index deletion candidates
- missing-from-Grookai insertion candidates
- reconciliation priority scores

## Completion Boundary

A set is complete only when all expected English physical card identities and all expected English physical printing/finish facts are master-admissible or explicitly source-backed absent/not-applicable.

If any finish fact remains API-only, single-source, ambiguous, or generally described but not card-level proven, the set is incomplete.

## Audit-Only Rule

This contract is audit-only.

Allowed outputs are local JSON and Markdown reports under:

```text
docs/audits/english_master_index_completion_v1/
```

Forbidden:

- DB writes
- migrations
- apply runners
- cleanup
- quarantine apply
- public hiding
- canonical mutation

## Success Definition

Success means Grookai has:

- a full English physical set completion matrix
- a card identity completion matrix
- a printing/finish completion matrix
- a source gap queue
- a conflict/manual review queue
- a master-admissible export
- a clear statement of which sets are complete, partial, blocked, or out of scope

No Grookai DB reconciliation is part of success for this contract.
