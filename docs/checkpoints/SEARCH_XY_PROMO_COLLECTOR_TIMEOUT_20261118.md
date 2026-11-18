# Printed XY promo collector search correction

The Samsung's `pika xy124` search returned `Resolver degraded: resolver_timeout`.
The public API reproduced the failure. Verified-TLS, read-only canonical database
sanity passed with 173,837 parents, 3,420 sets, 47,409 traits and 325 compatibility
Vault rows. Exact catalog inspection found retained parent
`c1fa0bfa-ab99-41d6-9423-96effff0db10`, `GV-PK-PR-XY-XY124`, Pikachu-EX,
printed number `XY124`, numeric number `124`, set `xyp`.

The normalizer incorrectly admitted three-digit `xy124` as an expansion code.
This prevented the structured collector route and supplied an impossible set
constraint. Independent caller-visible SDK profiling also showed unscoped
case-insensitive number/name reads exhausting the existing three-second database
budget. A set-scoped live API request returned the correct retained card.

Three-digit printed XY collector tokens now identify the existing `xyp` promo
family while one/two-digit XY expansion tokens retain their previous meaning.
Exact number prefixes, suffixes, case-insensitive matching, name constraints and
language filters remain intact. The existing fast collector route admits a
single known promo family and pushes its set constraint into the caller-scoped
database query before number/name matching. Missing numbers stay empty; errors
still propagate. No timeout was increased and no fallback or inferred card was
added.

The candidate was advanced to PR953/main
`e22e40e9c09075b8c19a96161786f4934e19662a` after its overlapping search changes
merged. Current Pokemon playable filtering and expiring badge enrichment remain
intact. The combined focused search/playables suite passes 56 tests. Earlier
qualification attempts were stopped before commit for the GV-ID guard and this
integration; neither interrupted attempt qualifies the final source.

Five new regression cases failed on the original implementation. The corrected
focused suite passes 48 tests covering the actual route, printed XY numbers,
nicknames, case, wrong sets/prefixes/suffixes/names, language scope, empty results,
existing SWSH/SVP families, expansion codes, artist pagination and printing
preservation. Retained GV identifiers keep the identifier resolver ahead of
collector interpretation; a separate failing regression caught this priority
edge before commit. Anonymous read-only SDK profiling against the canonical project
returned the exact parent in 503ms and fully enriched results in 623ms, compared
with the original approximately 3.4-second statement timeouts. This profiling
executes the repository's server modules through a read-only client; it does not
start a development server against production.

Replay focused coverage:

```powershell
node --test --test-concurrency=1 tests/contracts/search_collector_number_regression.test.mjs tests/contracts/artist_search_pagination_route.test.mjs tests/contracts/cross_tcg_card_name_search_v1.test.mjs tests/contracts/search_set_metadata_reuse.test.mjs tests/contracts/search_ranking_printing_preservation.test.mjs
```

Full normal managed commit/push hooks, hosted checks and production API/Samsung
readback remain release gates. Terminal private receipts are under
`C:/grookai_search_xy124_20261118/artifacts/search_xy124_v1/20261118/`.
The existing Samsung build552 uses this shared server endpoint; a native update
is not required for this server correction. Preserve its signer, account and
data. No migration, canonical identity, pricing, inventory or provider changes
belong to this fix, and no mobile/store release is claimed here.
