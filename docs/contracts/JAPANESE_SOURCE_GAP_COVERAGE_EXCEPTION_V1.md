# Japanese source-gap coverage exception V1

Status: Planned worker candidate. Preparation is authorized; production policy
adoption, merge/deployment and activation are not authorized by this document.
The existing cross-TCG publication contract remains the production rule until
the owner approves the exact qualified release.

Only the seventeen printing UUIDs and twenty artifact UUID/hash/byte-size pins
in `backend/pricing/japanese_source_gap_seventeen_preparation_v1.json` are in
scope. Its SHA256 is
`d5773c271507a4735440b3f460c0dd05bcbf458b949a12aea51c882068920bc3`.
The original preparation workspace, proposal, source proof and every original
provider file remain retained. The manifest is not resealed or broadened.

The exception applies only to completed source run
`7da8a525-2fdb-4437-9cb5-3daa2d11e0a5` and accepted baseline publication
`e26f4ee7-3320-4cf4-b2ef-b53f08d86a9c`, run
`a94c5a93-2360-4b78-a4ef-8ee6eb566ce7`. The server-clock expiry remains
November 25, 2026 at 09:08:53.629 UTC. It cannot carry forward to another source,
baseline or expiry. A different source may still pass the unchanged ordinary
guard; it receives no exception.

For this exact source, fifteen provider price rows are absent and two have null
Market prices. Exclude exactly those seventeen from the Japanese coverage
baseline: 2,545 becomes 2,528. Apply the unchanged 0.1% loss limit to the remaining
baseline. Other cohorts and all quote/identity/mapping/freshness/lineage guards
remain unchanged. The named seventeen cannot appear as selected fresh quotes
while the exception is applied. Preserve dated accepted last-known prices under
`MARKET_PRICE_RETENTION_DISPLAY_V1`; they do not count as fresh coverage.

Worker 31 keeps the predecessor qualification evaluator and snapshot amounts.
Its separate V4 guard reads the actual run/publication/mode and database clock,
current accepted baseline, latest completed source, complete distinct Japanese
printing inventories and the twenty actual source artifact pins/bytes. It
admits no configurable exclusion list, threshold, alternate source, clock or
force flag. It changes no migration, grant, mapping, canonical printing, image,
owner row, old decision, old snapshot or old publication pointer.

A full unlimited-source shadow must pass both cross-TCG and existing MTG/English
Pokemon activation coverage before it can become `shadow_verified`. Failure is
durably recorded as a failed shadow. Persist its exact coverage qualification in
the existing reconciliation JSON. Limited/canary shadows remain incapable of
bootstrapping production. V4 bootstrap requires worker 31, complete phase counts,
full source reconciliation and a successful V4 proof bound to the actual run,
publication and source. Worker 30 shadows cannot qualify worker 31.

Production revalidates coverage and persists its proof in the same transaction
as the unchanged atomic activation procedure. Diagnostic readiness is not owner
approval. Before release, require normal local/hosted checks on exact committed
source, actual-source/SQL qualification, an independent new full worker-31
shadow, completion/draining of older writers, the exact owner release decision,
guarded activation, independent public/app amounts and natural refresh readback.
No source/manifest flag or test receipt substitutes for that decision.
