# Japanese Master Index V4 Schema-Chain Repair

Verified: 2026-08-05

## Result

- Status: `complete_no_production_apply`
- Repair migration after current-main integration:
  `supabase/migrations/20260805100000_master_identity_graph_jpn_review_surfaces_schema_repair_v1.sql`
- Production database mutations: **none**
- Local fresh-chain replay: **passed**
- Japanese payload preflight after repair: `preflight_complete_no_write`
- Payload fingerprint remained:
  `14be9772c50707a8e200e3b8d63d4bf831fab0de63c63741b3253623bc26d3e3`
- Blocking payload collisions: **0**
- Repository schema drift tables: **0**

## Recovered Surfaces

- `public.card_print_identity_source_evidence`
- `public.card_print_family_review_queue`
- `public.set_master_identity_graph_jpn_review_tables_updated_at_v1()`

The live objects existed without corresponding rows in
`supabase_migrations.schema_migrations`. The repair therefore uses a new
forward migration instead of inventing or restoring unknown historical
migration files.

## Replay Proof

The original isolated branch passed `supabase db reset --local --no-seed`.
Current-main integration later introduced
`20260728002603_remote_schema.sql`, which captures the same out-of-band
tables and therefore must run before this idempotent repair. The unapplied
repair was retimestamped to `20260805100000`. A fresh current-main chain
replay then passed through all migrations, including this repair.

The replayed tables match the captured live contract:

- 27 columns
- 11 constraints
- 10 indexes
- 4 deny-client RLS policies
- 4 effective table grant rows
- 2 updated-at triggers
- 2 exact table comments

PostgreSQL catalog output differed only in JSON property order and redundant
parentheses around check expressions. Column values, constraint names and
semantics, index definitions, RLS state, policies, grants, triggers, owner,
and comments matched.

## Safety Contract

- The repair migration contains no `INSERT`, row `UPDATE`, `DELETE`, or
  `TRUNCATE`.
- Existing rows are preserved.
- A partially existing table with missing required columns fails closed.
- Client roles receive no table privileges and explicit deny policies.
- `service_role` receives only `SELECT`, `INSERT`, and `UPDATE`.
- No pricing, English identity, vault, image, Storage, or family-link rows
  are touched.

## Remaining Boundary

This repair makes the repository chain authoritative for these two surfaces.
It does not authorize applying the Japanese payload or the repair migration
to production. Public child printings remain deferred behind their separate
visibility and self-hosted-image gate.
