# GVID_ROUTE_AUDIT_V1

## Why this audit was run

This audit was run to verify whether the newly identity-backed legacy English surface was already routable through `/card/[gv_id]`, and to determine whether any failure was caused by the route read path or by missing parent `gv_id` values.

## Current query behavior

`getPublicCardByGvId.ts` resolves the route from `public.card_prints` first.

- Base table: `public.card_prints`
- Base filter: `.eq("gv_id", <route param>)`
- Legacy null fields: the query does not filter on `number`, `number_plain`, or `set_code`
- Active identity lookup: performed as a separate optional read from `card_print_identity` after the parent row is found
- Result: a row with active identity but `card_prints.gv_id IS NULL` is not routable through `/card/[gv_id]`

The current route query is not excluding these rows because of inner join behavior or active-identity nested select behavior. It is excluding them because the route key does not exist on the parent row.

## Audit findings

- Active identity rows: `10613`
- Active identity rows with parent `gv_id`: `0`
- Active identity rows with parent `gv_id IS NULL`: `10613`
- Reachable via current route shape: `0`
- Excluded due to duplicate route `gv_id`: `0`
- Excluded due to parent missing `gv_id`: `10613`

Sample excluded rows all show the same reason: `PARENT_GV_ID_NULL`.

## Claim outcome

`CLAIM_DISPROVED`

The claim that these active identity-backed rows already have `gv_id` is disproved by the live audit. The current covered surface has active identity rows, but their parent `card_prints` rows do not have routable `gv_id` values.

## Route fix decision

No read-path fix was applied in this phase.

Reason:
- `/card/[gv_id]` already resolves correctly for rows that actually have `card_prints.gv_id`
- no query bug was found that can make a null parent `gv_id` routable
- fixing this would require generating or materializing parent `gv_id`, which exceeds this phase scope

## Conclusion

The route is not the blocker. The blocker is the parent key surface.

`/card/[gv_id]` does not currently reach the newly identity-backed rows because `10613` affected parent rows still have `card_prints.gv_id IS NULL`.
