# Why Two SVP Duplicate Parents Remain

Plain-English explanation for the final two post-reconciliation duplicate parent groups.

## Short Answer

These two rows were intentionally left in place because they are tied to append-only feed history.

They are not ordinary duplicate cleanup candidates.

The remaining groups are:

| Card | Canonical parent | Duplicate parent | Why left |
| --- | --- | --- | --- |
| SVP Bulbasaur #046 | `GV-PK-PR-SV-046` | `GV-PK-PR-SV-46` | Duplicate parent has historical `card_feed_events` rows. |
| SVP Greninja ex #054 | `GV-PK-PR-SV-054` | `GV-PK-PR-SV-54` | Duplicate parent has historical `card_feed_events` rows and market-data dependencies. |

## Why We Did Not Delete Them

`card_feed_events` is append-only by database contract.

The table has mutation blockers:

- `trg_card_feed_events_block_update`
- `trg_card_feed_events_block_delete`

Those triggers call `card_feed_events_block_mutation_v1()`, which raises:

```text
card_feed_events is append-only
```

The duplicate parents are referenced by three historical feed impression rows:

- Bulbasaur duplicate parent: 1 feed event
- Greninja ex duplicate parent: 2 feed events

Deleting these duplicate parents would conflict with the feed-history contract because the foreign key is `ON DELETE CASCADE`. Repointing the feed rows would require updating append-only history, which the database intentionally blocks.

## Current Governance Status

These rows are classified as:

```text
governed exceptions
blocked_by_append_only_feed_contract
```

They are still visible in the raw duplicate audit, but they are excluded from the actionable cleanup queue.

Current post-reconcile duplicate state:

- raw duplicate parent groups: 2
- actionable duplicate parent groups: 0
- governed duplicate parent exceptions: 2
- raw duplicate active identity groups: 2
- actionable duplicate active identity groups: 0
- governed active identity exceptions: 2
- display image risk rows: 0

## Where This Is Recorded

Primary report:

```text
docs/audits/post_reconcile_integrity_v1/post_reconcile_append_only_feed_governance_v1.md
```

Machine-readable report:

```text
docs/audits/post_reconcile_integrity_v1/post_reconcile_append_only_feed_governance_v1.json
```

The actionable-vs-governed split is also recorded in:

```text
docs/audits/post_reconcile_integrity_v1/post_reconcile_integrity_audit_v1.md
docs/audits/post_reconcile_integrity_v1/post_reconcile_integrity_audit_v1.json
```

## Future Options

There are only three safe paths forward:

1. Keep these two rows as governed exceptions.
2. Create a feed-correction event model that preserves the original feed events and records canonical remap intent without mutating history.
3. Create an explicit founder-approved maintenance path for feed remapping, with a fresh dry-run proof and a narrow real apply.

Do not silently delete these parents.
Do not bypass the append-only trigger casually.
Do not fold them into generic duplicate-parent cleanup.

## Search Terms

Use these terms to find this note later:

- SVP duplicate parent exception
- Bulbasaur `GV-PK-PR-SV-46`
- Bulbasaur `GV-PK-PR-SV-046`
- Greninja ex `GV-PK-PR-SV-54`
- Greninja ex `GV-PK-PR-SV-054`
- append-only feed history
- `card_feed_events`
- `POST-REC-03`
- Grey Felt Hat duplicate regression
- post-reconcile governed exception
