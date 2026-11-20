# TCGplayer cross-TCG Market publication V2

Status: Active implementation contract. Production activation requires the qualification below.

V2 extends Market publication to source category 68 / `one_piece_eng_print` and
85 / `pokemon_jpn`. English Pokémon and MTG continue through their unchanged V1
evaluator and V7 candidate projection. This does not widen the frozen V1 scope.

One Piece requires the existing exact durable product promotion, original
number/name authority metadata, source group, product-bound parent variant,
source-repaired child provenance, exact finish, unique ownership and visible,
nonprovisional canonical child. Japanese Pokémon requires an existing active
exact external printing mapping with explicit source subtype and matching
category, group, identity domain and child finish. Conflicting or ambiguous
mapping assertions, hidden children and provisional children are withheld.
No names, rarity, percentages, cross-condition substitutions or inferred finish
conversions create authority. Named Japanese finishes require their own explicit
authority; Normal is not a substitute for Master Ball or Poké Ball.

V2 retains real positive source `market_price`, USD, the completed and reconciled
current full source run, source artifact/hash and row lineage. Market freshness
remains 36 hours, delay/suppression semantics remain unchanged, and snapshots
must be revalidated against current source and mapping authority immediately
before insertion. New nullable source-parent or source-printing FKs identify
the two exclusive cross-TCG lanes on candidates, decisions and snapshots.
Japanese language is explicitly recorded as Japanese. No existing mapping,
canonical identity, printing review, old snapshot or old publication pointer is
rewritten by the migration.

An active-child/source mapping index supports bounded conflict and condition
lookups without changing mapping authority. The new security-invoker views are SELECT-only for service_role and unavailable
to public, anon and authenticated. Existing authenticated public-price RPCs
continue to expose qualified prices; no direct grant or frontend business logic
is added. Existing Vault valuation logic, asking prices and acquisition costs
remain unchanged. Publishing newly qualified Market prices may update current
market totals through the existing calculation. Condition references remain a
separate read-only feature with medium confidence and USD-assumed labeling.

Release requires a separately pinned canonical511-to512 schema scope, full
fresh512 replay with the declared historical647-pair prerequisite, populated511
upgrade and retained-data proof, full public/Square/inventory/vendor-pricing
schema and security comparison, positive/negative source-lineage runtime tests,
actual-size read performance, unchanged old-cohort output, normal local hooks
and hosted checks, frozen official CLI dry-run/apply, independent production
readback, a reconciled full shadow publication and atomic guarded activation.
The ordinary historical empty-shadow failure remains failed evidence; no prior
release flag is reused, no applied migration is edited, and no schema
difference SQL is executed. Completion requires live app readback and scheduled
refresh verification after deployment, not merely imported source rows.

Production bootstrap is enforced in the worker, including automatic watchdog
runs: require full unlimited-source reconciliation and a verified full V2
shadow for the same policy/worker version, or a verified current V2 publication
for that runtime. A changed worker execution authority requires a new version
and shadow; ordinary date/SHA changes can reuse the qualified runtime. Both new
cohorts must have positive eligible prices. Apply the existing 0.1% material-loss
safety threshold to their coverage counts, without changing any quote amount.
Older in-flight writers must finish or be safely drained before V2 activation.
