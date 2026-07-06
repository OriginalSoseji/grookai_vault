# E1-WATCH-BACKFILL-V1

Generated: 2026-07-06T22:21:39.967Z
Mode: dry-run
User scope: all
Limit users: none
After user id: none

## Totals

- Candidate watches: 385
- Users: 19
- Would insert: 0
- Conflicts: 385
- Max candidate count per user: 222
- Next after user id: d97b5ccf-266d-4be6-9014-6557dc5b830c

## Source Summary

| Source | Subject | Reason | Candidates | Users | Would insert | Conflicts |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| collector_follows | collector | manual | 5 | 2 | 0 | 5 |
| owned_cards | card | owned | 354 | 19 | 0 | 354 |
| owned_sets_3plus | set | inferred | 25 | 3 | 0 | 25 |
| wishlist_items | card | want | 1 | 1 | 0 | 1 |

## Guardrails

Top scoped users by candidate count:

| User | Candidate watches |
| --- | ---: |
| 03e80d15-a2bb-4d3c-abd1-2de03e55787b | 222 |
| c177a180-e36b-44cc-93f8-ee104717a389 | 80 |
| 3e81212e-ee4d-4086-ae4a-595936d29329 | 60 |
| 47544b87-8c55-40df-b665-db9253e92c3c | 6 |
| 4e218200-66d2-4a2d-a2b9-2c4162247b16 | 2 |
| 6b810fe6-a49b-4db5-8c00-653e3aee5a68 | 2 |
| 00eb142c-66b0-4d93-a2fc-1cec8b8fb922 | 1 |
| 08cc7f27-28c8-4443-a16a-cec0dc68f3f7 | 1 |
| 0f20fa17-cbf1-4a3c-b939-b01bc0631c14 | 1 |
| 2d695642-64ea-459c-ab5b-116c27b62367 | 1 |
| 2f112c89-3020-46ef-ad76-70f6b41bd554 | 1 |
| 300a2088-b844-4bf0-b0a9-86efdf518d11 | 1 |
| 33abf165-7580-42e0-8c43-ef9619411cc6 | 1 |
| 912a8c4c-7ad1-4d53-a32e-a46f1d1efc6c | 1 |
| 97973e17-7772-451d-a012-e552dba04c48 | 1 |
| bfffa809-7748-437c-99b0-7d10a804338a | 1 |
| d4a5e044-6030-4a84-8506-029287a26b6d | 1 |
| d50b21c9-dc14-42b2-9383-186a7ec5d199 | 1 |
| d97b5ccf-266d-4be6-9014-6557dc5b830c | 1 |

Skipped invalid subjects:

| Source | Skipped invalid subjects |
| --- | ---: |
| collector_follows | 0 |
| owned_cards | 15 |
| owned_sets_3plus | 15 |
| wishlist_items | 0 |

## Rollback

Dev/user-scoped rollback:

```sql
delete from public.watches where user_id = '<user_id>' and origin = 'backfill_v1';
```

Full rollback requires explicit production approval:

```sql
delete from public.watches where origin = 'backfill_v1';
```

