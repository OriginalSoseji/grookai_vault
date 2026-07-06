# E1-WATCH-BACKFILL-V1

Generated: 2026-07-06T22:04:26.066Z
Mode: dry-run
User scope: all
Limit users: 1

## Totals

- Candidate watches: 0
- Users: 0
- Would insert: 0
- Conflicts: 0

## Source Summary

| Source | Subject | Reason | Candidates | Users | Would insert | Conflicts |
| --- | --- | --- | ---: | ---: | ---: | ---: |

## Rollback

Dev/user-scoped rollback:

```sql
delete from public.watches where user_id = '<user_id>' and origin = 'backfill_v1';
```

Full rollback requires explicit production approval:

```sql
delete from public.watches where origin = 'backfill_v1';
```

