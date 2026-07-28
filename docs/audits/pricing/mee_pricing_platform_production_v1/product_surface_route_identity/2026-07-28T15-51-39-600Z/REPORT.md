# Product Surface Route Identity Report

## Result

`passed`

The source-to-render verifier now rejects captures whose route or screen
identity does not match the required product surface.

## Rules Added

- Card detail: `/card/<gv-id>`
- Search: `/explore?q=...` after entering through `/search`
- Explore: `/explore` without `q`
- Set grid: `/sets/<set-code>`
- Compare: `/compare`
- Private Vault: `/vault`
- Public Vault: `/u/<collector-slug>`
- Vault item: `/vault/card/<id>` or `/vault/gvvi/<gvvi-id>`
- Market history: `/card/<gv-id>/market`
- Flutter: exact canonical screen identity per required surface

## Verification

```text
node --test tests/contracts/tcgplayer_market_product_surface_proof_v1.test.mjs
12 passed, 0 failed

npm run contracts:test
869 passed, 0 failed
```

The focused contract proves valid routes pass and mislabeled web and Flutter
routes fail with `surface_route_identity_mismatch`.

## Boundary

- No database write.
- No migration.
- No publication change.
- No deployment.
- No anonymous-access change.
- Frozen canary unchanged.

## Remaining Gate

Run the route-bound capture process against the exact post-canary production
deployment. Repository tests are readiness evidence, not production surface
proof.
