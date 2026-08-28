# Print Identity Search Visible Bound V1

## Objective

Repair `search_print_identity_v1` so hidden catalog rows cannot consume the
bounded high-priority name candidate slots of a caller who cannot receive
those rows.

## Problem

`PRINT_IDENTITY_SEARCH_BOUNDED_CANDIDATES_V1` applies its `name_seed` limit
before `catalog_parent_gv_id_visible_to_request_v1` is evaluated later in
`candidate_cards`. When hidden and visible catalogs share a matching name,
hidden rows can fill the bound, make `name_seed_sufficient` true, suppress the
lower-ranked candidate families, and underfill or empty an anonymous page.

## Decision

Apply the existing request-role parent visibility helper inside `name_seed`,
before ordering and limiting. Require a non-null parent GV-ID at the same
boundary. Compute `name_seed_sufficient` only from this visible bounded seed.

The final `candidate_cards` visibility predicate remains as defense in depth
for every other seed family.

## Invariants

1. The function name, argument defaults, return columns, and result ordering
   remain unchanged.
2. Anonymous callers may receive Pokemon and explicitly public games only.
3. Authenticated callers may additionally receive signed-in games.
4. Hidden games remain excluded for every request role.
5. A row excluded by request-role visibility cannot consume `name_seed` capacity
   or contribute to `name_seed_sufficient`.
6. Set, number, object type, finish, cameo, fallback, rank, limit, and offset
   semantics remain unchanged.
7. Direct execution remains granted only to `anon`, `authenticated`, and
   `service_role` after revoking `public`.
8. The function remains `stable`, `security definer`, and pinned to
   `search_path = public`.

## Boundaries

- one forward-only function-replacement migration;
- no table, row, identity, release-control, image, pricing, publication, or
  Vault mutation;
- no historical migration edits;
- no game-foundation writes;
- no change to app visibility policy.

## Rollback

Before apply, execute the migration in a transaction and roll it back after
definition, ACL, and representative query readback. If a durable rollback is
needed after apply, restore the exact function body and comment from
`20260824174500_print_identity_search_bounded_candidates_v1.sql` through a new
forward migration. Never edit or delete either historical migration.

## Acceptance

- hidden rows cannot consume the anonymous name bound;
- visible rows still satisfy and fill the requested page;
- authenticated signed-in behavior remains available;
- function signature, output shape, grants, and final visibility defense are
  unchanged;
- migration/contract tests and rollback-only database smoke pass;
- production apply and readback occur only as a separately recorded gate.
