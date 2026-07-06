# E1-WATCH-BACKFILL-V1

Generated: 2026-07-06T22:05:06.942Z
Mode: apply
User scope: 33333333-3333-4333-8333-333333333333
Limit users: none

## Totals

- Candidate watches: 6
- Users: 1
- Would insert: 1
- Conflicts: 5
- Affected: 6
- Inserted: 1
- Updated: 5

## Source Summary

| Source | Subject | Reason | Candidates | Users | Would insert | Conflicts |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| collector_follows | collector | manual | 1 | 1 | 0 | 1 |
| owned_cards | card | owned | 3 | 1 | 0 | 3 |
| owned_sets_3plus | set | inferred | 1 | 1 | 1 | 0 |
| wishlist_items | card | want | 1 | 1 | 0 | 1 |

## Post-Apply Watch Counts

| Subject | Reason | Origin | Rows | Users |
| --- | --- | --- | ---: | ---: |
| card | owned | live | 3 | 1 |
| card | want | live | 1 | 1 |
| collector | manual | live | 1 | 1 |
| set | inferred | backfill_v1 | 1 | 1 |

## Rollback

Dev/user-scoped rollback:

```sql
delete from public.watches where user_id = '<user_id>' and origin = 'backfill_v1';
```

Full rollback requires explicit production approval:

```sql
delete from public.watches where origin = 'backfill_v1';
```

