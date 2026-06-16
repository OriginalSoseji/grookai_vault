# POST-REC-03 Append-Only Feed Governance V1

Audit-only governance report for the final post-reconciliation duplicate parent groups.

## Safety

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- apply_sql_generated: false

## Summary

- blocked_groups: 2
- duplicate_parent_rows: 2
- duplicate_child_rows: 3
- feed_event_rows: 3
- target_sets: svp
- governance_fingerprint: `099ec120e14f3f736730b4522a4fd46087c284a8e5718978c742d64bb0dc68ec`

## Remaining Groups

| Set | Group | Canonical GV ID | Duplicate GV ID | Duplicate child rows | Feed rows |
| --- | --- | --- | --- | ---: | ---: |
| svp | svp|46|bulbasaur|| | GV-PK-PR-SV-046 | GV-PK-PR-SV-46 | 2 | 1 |
| svp | svp|54|greninja ex|| | GV-PK-PR-SV-054 | GV-PK-PR-SV-54 | 1 | 2 |

## Feed Mutation Guard

| Trigger | Enabled | Definition |
| --- | --- | --- |
| trg_card_feed_events_block_delete | O | `CREATE TRIGGER trg_card_feed_events_block_delete BEFORE DELETE ON public.card_feed_events FOR EACH ROW EXECUTE FUNCTION card_feed_events_block_mutation_v1()` |
| trg_card_feed_events_block_update | O | `CREATE TRIGGER trg_card_feed_events_block_update BEFORE UPDATE ON public.card_feed_events FOR EACH ROW EXECUTE FUNCTION card_feed_events_block_mutation_v1()` |
| trg_card_feed_events_set_insert_defaults | O | `CREATE TRIGGER trg_card_feed_events_set_insert_defaults BEFORE INSERT ON public.card_feed_events FOR EACH ROW EXECUTE FUNCTION card_feed_events_set_insert_defaults_v1()` |

The feed mutation blocker raises the append-only error: true.

## Governance Decision

These rows are not ready for an apply package under the current contract. The duplicate parent rows are tied to append-only user-history events. Generic dependency transfer would require updating or deleting rows in `card_feed_events`, which the database intentionally blocks.

Recommended choices:

1. Keep as governed exceptions and teach the post-reconcile uniqueness gate to report them separately from actionable duplicate defects.
2. Add a future feed-correction event model that preserves the original event and records canonical remap intent without mutating old feed rows.
3. Add a founder-approved maintenance-only migration that explicitly allows canonical feed remap, then dry-run and apply a tiny follow-up cleanup package.

Do not silently delete the duplicate parents while the feed rows exist. The foreign key is `ON DELETE CASCADE`, and that would conflict with the append-only history contract.
