# Child Printing Public Identity Write Plan

Generated: 2026-05-19T03:51:55.792Z

Status: NOT APPLIED.

This is a no-write plan for a later approved task.

## Schema Step

Add nullable `public.card_printings.printing_gv_id` and a partial unique index.

Draft migration: `supabase/migrations/20260518180000_child_printing_public_identity_v1.sql`

## Candidate Step

- exact dry-run candidate count: 55582
- approved candidate count: 44698
- blocked candidate count: 10884
- collision count: 0

## Apply Gate

Do not apply until:

- the nullable schema migration is reviewed
- blocked candidates are reviewed or intentionally deferred
- proposed ID collision count is zero
- parent gv_id collision count is zero
- owned child printings are manually prioritized

## Rollback

Because the column is nullable, rollback is:

1. clear future assigned `printing_gv_id` values for affected rows
2. drop the partial unique index
3. drop the nullable column only if no app release depends on it

## Post-Write Verification

- every assigned `printing_gv_id` is unique
- every assigned ID starts with parent `card_prints.gv_id`
- no parent `card_prints.gv_id` changed
- Species Dex denominator remains parent-print based
- no public child printing route is enabled
