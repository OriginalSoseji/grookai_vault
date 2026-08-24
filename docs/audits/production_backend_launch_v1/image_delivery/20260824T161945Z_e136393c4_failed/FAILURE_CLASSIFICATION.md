# Production Image Delivery Failure Classification

- Observed: `2026-08-24T16:18:41.242Z`
- Deployed web commit: `e136393c47a9941a5e2b4a846566f697f9a0f9d9`
- Production deployment: `dpl_6xj6Wi6iAzuJHEj1AFSRc5r1ifsH`
- Rollback deployment: `dpl_9exhfBoYgtUk8VWkmLbRqAB2G85z`
- Report fingerprint: `cddf9eaef200aa7204971abbb5fcecbbfce7951217855a19ec3f9b9b90b74c2e`

## Result

The run correctly proved the underlying self-hosted image objects but used an
invalid cohort for its anonymous production-proxy probe.

- Direct Storage HEAD: `3000/3000`
- Direct Storage full body and image signature: `100/100`
- Anonymous production proxy: `31/100`
- Storage or body failures: `0`
- Proxy `404` responses: `69`

The 69 proxy responses were:

- MTG: `65`
- One Piece: `4`
- Other games: `0`

MTG and One Piece were not released to anonymous users at observation time.
The proxy route correctly applied `catalog_card_print_visible_to_request_v1`
and returned `404` rather than exposing hidden catalog images. These rows were
not missing images and must not be repaired by widening RLS or release status.

## Decision

Keep the production authorization boundary unchanged. Repair the audit so:

1. direct Storage probes continue to cover every eligible self-hosted catalog;
2. anonymous proxy probes sample only Pokemon and explicitly public catalogs;
3. signed-in proxy probes require an explicit bearer token and sample Pokemon,
   signed-in, and public catalogs; and
4. failed audit status returns a nonzero process exit code.

The original JSON, selected rows, and probe payloads in this directory remain
the immutable failed-run evidence. No database, Storage, image-pointer,
canonical, pricing, or Vault writes occurred.
