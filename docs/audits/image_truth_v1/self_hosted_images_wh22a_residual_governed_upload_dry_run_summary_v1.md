# IMG-HOST-WH-22A-RESIDUAL-GOVERNED-UPLOAD-DRY-RUN

- Generated: 2026-07-22T22:20:10.801Z
- Mode: dry_run_no_write
- Source/storage TLS verification: enabled_with_node_bundled_plus_windows_system_ca_roots
- Approval fingerprint: `ba3fc47ec7c3e18fadcd84b51d921fce270d32c12fda4913b92e7fc67fa4753f`
- Asset manifest hash: `c29f061a3c75a692df74133d79510310e74f4f260b84852b04171c6271c9a701`
- Row manifest hash: `80a52168fcdf3079251357e82e8291774caba834cefe675b557a36c943bcfcb9`
- Parent-row mappings: 24
- Unique verified assets: 21
- New uploads required now: 19
- Existing first-party assets reused: 2
- Representative rows sharing a base asset: 3
- Rows with a functional current third-party fallback: 0
- Rows receiving a verified provider fallback in WH22: 24
- Exact-status promotions (missing -> exact): 19
- Ready for storage apply: true
- Stop findings: none
- Storage writes performed: false
- Database writes performed: false
- Migrations created: false

## Coverage accounting

| measure | before | projected after WH22 |
| --- | ---: | ---: |
| Governed English physical parent rows | 51335 / 51359 | 51359 / 51359 |
| Broad canon-hosted GV-ID rows | 53320 / 53374 | 53344 / 53374 |

The governed denominator excludes all 2012 `GV-TCGP-*` Pocket rows and all 3 E7TEST fixture rows. The projected broad hosted count of 53344 includes 1985 already-hosted Pocket rows, so it is not the governed physical denominator.

## Source providers

| provider | count |
| --- | --- |
| pkmncards | 17 |
| pokemontcg | 2 |
| tcgplayer | 2 |

## WH22 column decision

WH22 writes a role-minimal subset of `card_prints.image_source, card_prints.image_path, card_prints.image_status, card_prints.image_url, card_prints.representative_image_url`. Exact parents receive the verified fallback in `image_url`; stamped representative rows receive the verified base-art fallback in `representative_image_url`. `image_alt_url` and `image_note` remain unchanged. The immutable before snapshot retains every replaced dead provider URL as acquisition evidence.
