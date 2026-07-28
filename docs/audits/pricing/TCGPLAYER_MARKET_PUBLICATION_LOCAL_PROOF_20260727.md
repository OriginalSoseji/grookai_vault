# TCGPlayer Market Publication Local Proof - 2026-07-27

## Producing State

- Branch: `pricing/mee-productization-v1`
- Commit: `a8bba197`
- Database: isolated local Supabase
- Production writes: none

## Migration Replay

`supabase db reset --local --yes` completed successfully through
`20260727120000_tcgplayer_market_publication_v1.sql`.

## Integration Smoke

`node scripts/audits/tcgplayer_market_publication_local_smoke_v1.mjs` passed.

Verified:

- one exact source observation qualified and published
- market close read back as `$12.34`
- completed phases resumed without duplicate phase attempts
- a second immutable publication generation was created
- rollback restored the first publication generation
- append-only decision mutation was rejected
- authenticated shared read returned one row
- authenticated provenance trace execution privilege was false
- service-role provenance trace execution privilege was true
- service trace returned the exact source observation

## Smoke Identifiers

- Source run: `dcbdbc99-72d7-4416-9958-bd0bade57638`
- Card print: `3458295b-e7d1-4926-af9f-a931ba49be54`
- Card printing: `1fe3c8d3-1ec7-41f0-9cdc-9f64c4cecb9a`
- First publication set: `b8c3c041-32fa-43d4-b1ba-062ffc008dce`
- Second publication set: `237373b9-0cd8-427c-ad87-368bb44f1552`
- Restored publication set: `b8c3c041-32fa-43d4-b1ba-062ffc008dce`

The full generated smoke artifacts remain local under the ignored
`artifacts/market_pricing_product_v1/local_smoke/` tree. This permanent report
preserves the production-relevant result without committing transient logs.
