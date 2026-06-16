# Image Truth IMG-15A eBay Browse Evidence-Only Probe V1

Generated: 2026-06-15T04:28:46.583Z

This is audit-only. It does not update database rows, upload images, create migrations, clean up, quarantine, consume the Grookai eBay budget RPC, or promote listing images.

## Safety

- package_id: IMG-15A-EBAY-BROWSE-EVIDENCE-ONLY-PROBE
- db_writes_performed: false
- storage_uploads_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- listing_images_used: false
- canonical_image_promotion_allowed: false

## Summary

- source_rows: 6
- searched_rows: 6
- source_unavailable_rows: 0
- title_evidence_candidate_rows: 3
- no_title_evidence_rows: 3
- listings_seen: 27
- fingerprint: `36ed55969624a13fb207e7546a96b3f31a02d7b1245d62e6c30aef1a8a6a6247`

## Rows

| status | set | number | card | finish | query | matches | reason |
| --- | --- | --- | --- | --- | --- | --- | --- |
| evidence_candidate_title_only | sv03.5 | 004 | Charmander | cosmos | Pokemon 151 Charmander cosmos holo 004 | 5 | ebay_listing_title_matches_identity_finish_but_images_excluded |
| evidence_candidate_title_only | sve | 3 | Basic Water Energy | reverse | Pokemon scarlet violet energy Basic Water Energy reverse holo 3 | 2 | ebay_listing_title_matches_identity_finish_but_images_excluded |
| no_exact_title_evidence | sve | 5 | Basic Psychic Energy | reverse | Pokemon scarlet violet energy Basic Psychic Energy reverse holo 5 | 0 | no_listing_title_matched_exact_identity_finish |
| no_exact_title_evidence | sve | 6 | Basic Fighting Energy | reverse | Pokemon scarlet violet energy Basic Fighting Energy reverse holo 6 | 0 | no_listing_title_matched_exact_identity_finish |
| evidence_candidate_title_only | swsh4.5 | 60 | Professor's Research | holo | Pokemon shining fates Professor's Research holo 60 | 3 | ebay_listing_title_matches_identity_finish_but_images_excluded |
| no_exact_title_evidence | xy8 | 146a | Professor's Letter | normal | Pokemon breakthrough Professor's Letter 146a | 0 | no_listing_title_matched_exact_identity_finish |

## Decision

eBay Browse may be useful as volatile listing evidence, but it is not approved as a canonical image source. Listing image URLs remain excluded until licensing, stability, and exact visual proof rules are separately approved.
