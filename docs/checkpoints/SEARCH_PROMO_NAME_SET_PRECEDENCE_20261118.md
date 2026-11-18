# Printed promo names and implicit set shortcuts

PR956/main `0a0f90c3a303bbc027a1ba795e573282b0120377` corrected the
Samsung's `pika xy124` timeout. Production deployment7895290051 returned the
retained Pikachu-EX parent `c1fa0bfa-ab99-41d6-9423-96effff0db10` for that query.
Its follow-up acceptance exposed a pre-existing full-name failure:
`Pikachu XY124` returned an empty result with a `Set: Pikachu` chip. The catalog
interpreter mistook the card name for the opening word of Pikachu World Collection.

An attached, unambiguous printed promo token now supplies its existing family
as a hint when interpreting opening-word set shortcuts. An implicit shortcut
outside that family is discarded, leaving the card-name text intact. Complete
set names, set identifiers, explicit `from`/`in` connectors and explicit set URL
parameters retain their constraints. Quoted text, GV identifiers and spaced
numeric filters do not acquire this new hint. The existing bounded collector
reader remains responsible for exact number, name, language and visibility.

Two new tests failed before the correction. The combined actual-route,
catalog interpretation, collector, printing preservation and playables suite
passes 77 tests. An anonymous, read-only SDK profile read all 1,377 caller-visible
Pokemon sets, reproduced the erroneous Pikachu alias, verified its removal,
and returned the retained Pikachu-EX XY124 parent in 822ms. It used the repository
server modules without starting a development server against production.

This follow-up is based on PR959/main
`d6b62c55ce4146aba6a2f1d51a154d0094ce5972`. Preserve its paired mobile baseline553
and signer preflight. No APK update is needed for this shared server correction.
No migration, catalog/provider import, identity, price or inventory write belongs
to this task. Normal managed commit/push hooks, hosted checks and final production
API acceptance remain gates; Samsung verification also requires the user's
already-requested unlock. Never bypass the lock or reinstall the app.

Private terminal receipts:
`C:/grookai_search_xy124_20261118/artifacts/search_xy124_names_v1/20261118/`.
Original fix receipts remain separately preserved under `search_xy124_v1`.

```powershell
node --test --test-concurrency=1 tests/contracts/catalog_set_search.test.mjs tests/contracts/search_collector_number_regression.test.mjs tests/contracts/artist_search_pagination_route.test.mjs tests/contracts/cross_tcg_card_name_search_v1.test.mjs tests/contracts/search_set_metadata_reuse.test.mjs tests/contracts/search_ranking_printing_preservation.test.mjs apps/web/src/lib/playables/playablesSearch.test.mjs
```
