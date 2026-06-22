# League Marketplace Scan Sources Checkpoint V1

Date: 2026-06-22

## Scope

Audit-only marketplace scan for the current post-Collexy `league_marketplace_scan_sources` bucket.

No DB writes. No migrations. No apply. No deletes. No parent inserts. No child inserts. No identity inserts. No cleanup.

## Inputs

- Source packet: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_post_collexy_source_packet_v1.json`
- Source packet fingerprint: `4af3fb89cea076b48c0b2729405fdf9e64e30d43c1d46088b18d51ab219b199c`

## Outputs

- JSON: `docs/audits/english_master_index_source_exhaustion_v1/league_marketplace_scan_sources_v1/league_marketplace_scan_sources_v1.json`
- Markdown: `docs/audits/english_master_index_source_exhaustion_v1/league_marketplace_scan_sources_v1/league_marketplace_scan_sources_v1.md`
- Script: `scripts/audits/english_master_index_league_marketplace_scan_sources_v1.mjs`

## Results

| metric | value |
| --- | --- |
| rows_available_from_packet | 48 |
| rows_targeted | 48 |
| browse_queries_attempted | 96 |
| browse_queries_succeeded | 96 |
| exact_title_match_rows | 0 |
| exact_title_matches | 0 |
| partial_title_match_rows | 0 |
| variant_title_review_rows | 36 |
| variant_title_review_matches | 119 |
| no_usable_title_evidence_rows | 12 |
| write_ready_now | 0 |
| fingerprint_sha256 | `8324b5c6f47ac264e196572f75d3ba928c47f57d2f70aa683c15e371a296166b` |

## Notes

- eBay Browse credentials were available through OAuth client configuration.
- Local Node TLS could not verify the local certificate chain, so the run used a bounded local `NODE_TLS_REJECT_UNAUTHORIZED=0` override.
- The override is documented in the report and is not the script default.
- Marketplace title evidence is volatile and review-only.
- Several listings prove likely variant presence in title text, but the current queue does not carry a target active finish key for these rows.
- No marketplace row was promoted into source fixture evidence or Master Index truth.

## Decision

This lane produced review context only.

Do not create write packages from this report.

Next safe lane:

1. Move to `official_prize_pack_or_product_pdf_recheck`, or
2. Build a separate adjudication pass that compares observed marketplace finish terms against preserved index candidates without changing evidence rules.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false
- quarantine_performed: false
