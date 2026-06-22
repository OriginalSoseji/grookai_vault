# League Marketplace Scan Sources V1

Audit-only marketplace scan for the post-Collexy League Stamp finish-source bucket. This report does not promote marketplace listings into canonical truth and does not perform DB writes.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- write_ready_now: 0
- source_policy: eBay Browse listing titles are volatile review evidence only; they are not automatically promoted into Master Index truth.

## Summary

- rows_available_from_packet: 48
- rows_targeted: 48
- browse_queries_attempted: 96
- browse_queries_succeeded: 96
- exact_title_match_rows: 0
- exact_title_matches: 0
- partial_title_match_rows: 0
- variant_title_review_rows: 36
- credentials_state: oauth_client_configured
- fingerprint_sha256: `8324b5c6f47ac264e196572f75d3ba928c47f57d2f70aa683c15e371a296166b`

| review_status | count |
| --- | --- |
| variant_title_finish_review_only | 36 |
| no_usable_title_evidence | 12 |

## Review Rows

| set | number | card | stamp | finish | search | exact | partial | variant review | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bw11 | 97 | Deino | League Stamp |  | ok | 0 | 0 | 3 | variant_title_finish_review_only |
| bw7 | 38 | Delibird | League Stamp |  | ok | 0 | 0 | 3 | variant_title_finish_review_only |
| hgss3 | 79 | Darkness Energy | League Stamp |  | ok | 0 | 0 | 3 | variant_title_finish_review_only |
| hgss3 | 80 | Metal Energy | League Stamp |  | ok | 0 | 0 | 5 | variant_title_finish_review_only |
| hgss4 | 85 | Black Belt | League Stamp |  | ok | 0 | 0 | 2 | variant_title_finish_review_only |
| hgss4 | 88 | Seeker | League Stamp |  | ok | 0 | 0 | 2 | variant_title_finish_review_only |
| pl2 | 96 | Team Galactic's Invention G-109 SP Radar | League Stamp |  | ok | 0 | 0 | 2 | variant_title_finish_review_only |
| sm1 | 20 | Tsareena | League Stamp |  | ok | 0 | 0 | 5 | variant_title_finish_review_only |
| sm1 | 123 | Nest Ball | League Cup Staff Stamp |  | ok | 0 | 0 | 3 | variant_title_finish_review_only |
| sm2 | 55 | Oricorio | League Stamp |  | ok | 0 | 0 | 1 | variant_title_finish_review_only |
| sm2 | 119 | Aqua Patch | League Cup Staff Stamp |  | ok | 0 | 0 | 4 | variant_title_finish_review_only |
| sm3 | 41 | Raichu | League Stamp |  | ok | 0 | 0 | 2 | variant_title_finish_review_only |
| sm3 | 113 | Bodybuilding Dumbbells | League Cup Staff Stamp |  | ok | 0 | 0 | 2 | variant_title_finish_review_only |
| sm4 | 91 | Counter Catcher | League Cup Staff Stamp |  | ok | 0 | 0 | 3 | variant_title_finish_review_only |
| sm5 | 83 | Magnezone | League Stamp |  | ok | 0 | 0 | 7 | variant_title_finish_review_only |
| sm5 | 122 | Escape Board | League Cup Staff Stamp |  | ok | 0 | 0 | 5 | variant_title_finish_review_only |
| sm7 | 24 | Magcargo | League Stamp |  | ok | 0 | 0 | 4 | variant_title_finish_review_only |
| sm7 | 142 | Rare Candy | League Stamp |  | ok | 0 | 0 | 4 | variant_title_finish_review_only |
| sm7 | 145 | Steven's Resolve | League Stamp |  | ok | 0 | 0 | 5 | variant_title_finish_review_only |
| sm8 | 82 | Zebstrika | League Stamp |  | ok | 0 | 0 | 1 | variant_title_finish_review_only |
| sm8 | 172 | Electropower | League Cup Staff Stamp |  | ok | 0 | 0 | 5 | variant_title_finish_review_only |
| sv10 | 81 | Team Rocket's Mewtwo ex | League Stamp |  | ok | 0 | 0 | 2 | variant_title_finish_review_only |
| swsh1 | 179 | Quick Ball | League Cup Staff Stamp |  | ok | 0 | 0 | 3 | variant_title_finish_review_only |
| swsh4 | 153 | League Staff | League Cup Staff Stamp |  | ok | 0 | 0 | 4 | variant_title_finish_review_only |
| swsh7 | 49 | Pikachu | League Stamp |  | ok | 0 | 0 | 3 | variant_title_finish_review_only |
| xy1 | 56 | Pumpkaboo | League Stamp |  | ok | 0 | 0 | 2 | variant_title_finish_review_only |
| xy1 | 64 | Solrock | League Stamp |  | ok | 0 | 0 | 5 | variant_title_finish_review_only |
| xy1 | 123 | Professor's Letter | League Stamp |  | ok | 0 | 0 | 5 | variant_title_finish_review_only |
| xy10 | 63 | Lucario | League Stamp |  | ok | 0 | 0 | 3 | variant_title_finish_review_only |
| xy11 | 15 | Volcarona | League Stamp |  | ok | 0 | 0 | 3 | variant_title_finish_review_only |
| xy12 | 53 | Mew | League Stamp |  | ok | 0 | 0 | 2 | variant_title_finish_review_only |
| xy3 | 8 | Shelmet | League Stamp |  | ok | 0 | 0 | 1 | variant_title_finish_review_only |
| xy3 | 12 | Torchic | League Stamp |  | ok | 0 | 0 | 2 | variant_title_finish_review_only |
| xy4 | 66 | Klefki | League Stamp |  | ok | 0 | 0 | 5 | variant_title_finish_review_only |
| xy8 | 78 | Marowak | League Stamp |  | ok | 0 | 0 | 3 | variant_title_finish_review_only |
| xy9 | 40 | Greninja | League Stamp |  | ok | 0 | 0 | 5 | variant_title_finish_review_only |

## Governance

- Marketplace listings are volatile review evidence only.
- Exact title matches are not Master Index truth without preserved source URLs and a separate source-delta/adjudication pass.
- Generic League Stamp rows must not be promoted from broad listing language.
- This lane can reduce manual search time but cannot close rows by itself.
