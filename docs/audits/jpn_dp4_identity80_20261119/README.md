# Japanese DP4 English identity repair

Status: **80 corrections applied and independently read back**. Eight ten-record batches target only active identity payload English-name and normalized-family candidates. Each is backed by an official Japanese page with matching Pokédex number, byte-identical official/catalog image, an existing correct active primary-species link, and retained species-name source evidence. The original identity payload and exact source bytes must be preserved in restricted `raw_imports` before any write. Parent fields, species links, identity hashes, images, artist fields, external mappings, ownership and pricing are protected.

The pinned plan is `identity80-execution-plan-20261119.json`. `inspect` and `verify` are read-only; `rollback-proof` and `apply` require the already-authorized execution marker and the exact plan, current source/ownership checks, and same-writer, same-batch rollback proof. A partial or ambiguous commit must be read back before retrying. The plan excludes 16 mismatched official images and the two unresolved official-page links from the 136-parent review; it also excludes the four subject corrections already applied separately. This package does not resolve the wider Japanese identity or artist backlog.

## Execution and independent readback

The eight batches were applied to the production catalog after same-writer rollback proofs. The separate read-only snapshot `independent-identity80-readback-20261119.json` verified all 80 postimages, unchanged parent and species state, identity hashes, and eight durable receipts and retained source packages. Rollback-proof receipt IDs are not durable application receipts. The first chunk 0 apply timed out and rolled back; a separate inspection established it was pending before the successful retry.

| Chunk | Rollback proof run | Applied run / durable receipt | Independent chunk verify run |
| --- | --- | --- | --- |
| 0 | 4de205ad-850f-48c7-a440-3b849d6886fc | ce4d9d1f-4420-4a2b-9906-de2cf78e8d80 / 177035 | f151b287-a342-4619-b7b2-df2fcd25bd52 |
| 1 | 7a25d17b-b660-4d25-bb5b-2058735227cc | 91bc41cc-b71c-405f-abac-e48212468f94 / 177039 | bf0e26fc-85f4-4cde-8667-62e34c2b16a0 |
| 2 | d76b95a7-70f3-402a-8e46-7ae874c4b435 | 70225185-11bb-4d01-addf-ef8a27e01392 / 177043 | 3192ec43-d685-4430-9025-7f3564eea0dc |
| 3 | 1c341ae6-1d4c-4938-958e-01b93c2f101d | 3290eb1e-6b02-48c3-a44b-85e153a292cd / 177047 | 3b3b778c-d27b-4534-bbb4-49131a527608 |
| 4 | 86953982-c2b9-44fd-b970-b47f6133757d | 103076ac-605c-45a1-9a9c-9f0d3ad47b64 / 177051 | 464fe53a-7f21-430a-81ed-c172a92ec322 |
| 5 | 22a59c58-b648-4669-a2f3-eade418e4040 | 21275497-f1fe-4179-a351-de86bf598cba / 177055 | 5c0d8285-5ee1-4fee-bf4f-ef2f244d5480 |
| 6 | 65fc81f2-e992-4888-b2e4-18f22c6c5ad5 | bd326f5f-8396-4177-85a3-52f24d5ac4c3 / 177059 | e18c1037-7c24-45dd-aa95-a4dce99794e4 |
| 7 | ca4e7784-49ea-45f9-a28b-e91b8ff8ac72 | a3ebbe1d-fa4d-4e69-bb70-587633201260 / 177063 | 414ffe55-0b88-4321-82ea-192f3442afe5 |

The refreshed exact-name heuristic flagged 1,770 English-identity discrepancies; these flags require individual adjudication and are not a validated repair list. Artist fields remain untouched, and this work does not establish launch readiness.
